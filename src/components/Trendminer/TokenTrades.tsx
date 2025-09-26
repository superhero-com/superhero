import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TransactionsService } from "@/api/generated/services/TransactionsService";
import { TransactionDto } from "@/api/generated/models/TransactionDto";
import { TokenDto } from "@/api/generated/models/TokenDto";
import AddressChip from "../AddressChip";
import PriceDataFormatter from "@/features/shared/components/PriceDataFormatter";

// Transaction function constants
const TX_FUNCTIONS = {
  buy: "buy",
  sell: "sell",
  transfer: "transfer",
  mint: "mint",
  burn: "burn",
  create_community: "create_community",
} as const;

type TxFunction = (typeof TX_FUNCTIONS)[keyof typeof TX_FUNCTIONS];

// Pagination response interface
interface PaginatedTransactionsResponse {
  items: TransactionDto[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

interface TokenTradesProps {
  token: TokenDto;
}

export default function TokenTrades({ token }: TokenTradesProps) {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch transactions using React Query with server-side pagination
  const {
    data,
    isLoading: isFetching,
    error,
    refetch,
  } = useQuery<PaginatedTransactionsResponse>({
    queryKey: [
      "TransactionsService.listTransactions",
      token?.sale_address,
      itemsPerPage,
      currentPage,
    ],
    queryFn: async (): Promise<PaginatedTransactionsResponse> => {
      if (!token?.sale_address) {
        return { items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } };
      }

      try {
        const response = await TransactionsService.listTransactions({
          tokenAddress: token.sale_address,
          limit: itemsPerPage,
          page: currentPage,
        });

        // Handle the response - it should be Pagination type but we need to cast it
        if (response && typeof response === 'object' && 'items' in response) {
          return response as PaginatedTransactionsResponse;
        }

        // Fallback for different response formats
        if (Array.isArray(response)) {
          return {
            items: response,
            meta: { totalItems: response.length, totalPages: 1, currentPage: 1 }
          };
        }

        return { items: [], meta: { totalItems: 0, totalPages: 0, currentPage: 1 } };
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
        throw error;
      }
    },
    enabled: !!token?.sale_address,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 1 minute
  });

  // Table headers configuration
  const headers = useMemo(() => [
    { title: "Account", key: "account", sortable: false },
    { title: "Type", key: "tx_type", sortable: false },
    { title: token.symbol || "Volume", key: "volume", sortable: false },
    { title: "Unit Price", key: "price_data", sortable: false },
    { title: "Total Price", key: "spent_amount_data", sortable: false },
    { title: "Date", key: "created_at", sortable: false },
    { title: "Transaction", key: "tx_hash", sortable: false },
  ], [token.symbol]);

  // Function to get transaction type color
  function getTxFunctionCallColor(type: TxFunction) {
    switch (type) {
      case TX_FUNCTIONS.buy:
        return "green";
      case TX_FUNCTIONS.sell:
        return "red";
      case TX_FUNCTIONS.create_community:
        return "yellow";
      default:
        return "primary";
    }
  }

  // Helper function to get transaction styling based on type
  const getTxStyling = (txType: string) => {
    const normalizedType = txType?.toLowerCase() as TxFunction;
    const color = getTxFunctionCallColor(normalizedType);

    switch (color) {
      case "green":
        return {
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
          textColor: "text-green-400",
          chipBg: "bg-green-500/20",
        };
      case "red":
        return {
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          textColor: "text-red-400",
          chipBg: "bg-red-500/20",
        };
      case "yellow":
        return {
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          textColor: "text-yellow-400",
          chipBg: "bg-yellow-500/20",
        };
      default:
        return {
          bgColor: "bg-white/[0.05]",
          borderColor: "border-white/10",
          textColor: "text-white",
          chipBg: "bg-white/[0.05]",
        };
    }
  };

  // Helper function to get display name for transaction type
  const getDisplayName = (txType: string): string => {
    const normalizedType = txType?.toLowerCase();
    switch (normalizedType) {
      case "create_community":
        return "CREATE";
      case "buy":
        return "BUY";
      case "sell":
        return "SELL";
      case "transfer":
        return "TRANSFER";
      case "mint":
        return "MINT";
      case "burn":
        return "BURN";
      default:
        return txType?.toUpperCase() || "TRADE";
    }
  };

  // Helper function to format volume
  const formatVolume = (volume: string | number): string => {
    if (!volume) return "0";
    const num = typeof volume === 'string' ? parseFloat(volume) : volume;
    if (!isFinite(num)) return "0";
    
    // Use a simple formatting approach similar to Decimal.prettify()
    if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
    return num.toFixed(2);
  };

  // Helper function to format date
  const formatLongDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Handle page updates
  const updatePage = (page: number) => {
    setCurrentPage(page);
  };

  const transactions = data?.items || [];
  const totalItems = data?.meta?.totalItems || 0;
  const totalPages = data?.meta?.totalPages || 0;

  // Retry mechanism for failed requests
  React.useEffect(() => {
    if (currentPage === 1 && !transactions.length && !isFetching && !error) {
      const timer = setTimeout(() => {
        refetch();
      }, 10 * 1000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [currentPage, transactions.length, isFetching, error, refetch]);

  return (
    <div className="space-y-4">
      {/* Data Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-7 gap-4 px-6 py-4 border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wide">
          {headers.map((header) => (
            <div key={header.key} className="truncate">
              {header.title}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {transactions.map((transaction) => {
            const txStyling = getTxStyling(transaction.tx_type);
            
            return (
              <div
                key={transaction.id}
                className="grid grid-cols-1 md:grid-cols-7 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Account */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Account:</div>
                  <AddressChip address={transaction.account} linkToProfile={true} />
                </div>

                {/* Type */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Type:</div>
                  <div
                    className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${txStyling.textColor} ${txStyling.chipBg} border ${txStyling.borderColor}`}
                  >
                    {getDisplayName(transaction.tx_type)}
                  </div>
                </div>

                {/* Volume */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Volume:</div>
                  <div className="text-white font-medium">
                    {formatVolume(transaction.volume)}
                  </div>
                </div>

                {/* Unit Price */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Unit Price:</div>
                  <PriceDataFormatter watchPrice={false} priceData={transaction.price_data} />
                </div>

                {/* Total Price */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Total:</div>
                  <PriceDataFormatter watchPrice={false} priceData={transaction.spent_amount_data} />
                </div>

                {/* Date */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Date:</div>
                  <div className="text-white/70 text-sm">
                    {formatLongDate(transaction.created_at)}
                  </div>
                </div>

                {/* Transaction Hash */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">Tx:</div>
                  <AddressChip address={transaction.tx_hash} linkToProfile={false} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Loading State */}
        {isFetching && (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!isFetching && !transactions.length && (
          <div className="text-center py-12">
            <div className="text-white/40 text-lg mb-2">📈</div>
            <div className="text-white/60 text-sm">No transactions yet</div>
            <div className="text-white/40 text-xs mt-1">
              Trades will appear here once the token starts trading
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isFetching && (
          <div className="text-center py-12">
            <div className="text-red-400 text-lg mb-2">⚠️</div>
            <div className="text-red-400 text-sm">Failed to load transactions</div>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-xs hover:bg-red-500/30 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="space-y-4">
          {/* Items per page selector */}
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page
                }}
                className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#4ecdc4] transition-colors"
              >
                {[10, 20, 50, 100].map((option) => (
                  <option key={option} value={option} className="bg-gray-800 text-white">
                    {option}
                  </option>
                ))}
              </select>
              <span>items per page</span>
            </div>
            <div>
              Showing {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{' '}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} transactions
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => updatePage(Math.max(1, currentPage - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => updatePage(pageNum)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all duration-300 ${
                      currentPage === pageNum
                        ? "bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] text-white"
                        : "border border-white/10 bg-white/[0.05] text-white hover:bg-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => updatePage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}