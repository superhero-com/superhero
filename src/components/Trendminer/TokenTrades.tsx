import React from "react";
import AddressChip from "../AddressChip";

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

interface Transaction {
  tx_hash?: string;
  id?: string;
  tx_type?: string;
  created_at?: string;
  amount?: string | number | { [key: string]: number };
  token_amount?: string | number;
  account_address?: string;
  address?: string;
}

interface TokenTradesProps {
  transactions: Transaction[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  itemsPerPageOptions?: number[];
  totalItems?: number;
  onPageChange?: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export default function TokenTrades({
  transactions,
  loading = false,
  hasMore = true,
  onLoadMore,
  // Pagination props with defaults
  currentPage = 1,
  totalPages = 1,
  itemsPerPage = 10,
  itemsPerPageOptions = [10, 20, 50, 100],
  totalItems = 0,
  onPageChange,
  onItemsPerPageChange,
}: TokenTradesProps) {
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
          hoverBg: "hover:bg-green-500/20",
          icon: "📈",
        };
      case "red":
        return {
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          textColor: "text-red-400",
          hoverBg: "hover:bg-red-500/20",
          icon: "📉",
        };
      case "yellow":
        return {
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
          textColor: "text-yellow-400",
          hoverBg: "hover:bg-yellow-500/20",
          icon: "🏗️",
        };
      default:
        return {
          bgColor: "bg-white/[0.05]",
          borderColor: "border-white/10",
          textColor: "text-white",
          hoverBg: "hover:bg-white/[0.08]",
          icon: "🔄",
        };
    }
  };

  // Helper function to format amount (handle both strings, numbers, and price objects)
  const formatAmount = (
    amount: string | number | { [key: string]: number } | undefined
  ): string => {
    if (!amount) return "";

    if (typeof amount === "string") return amount;
    if (typeof amount === "number") return amount.toString();

    // If it's a price object with multiple currencies, use 'ae' if available
    if (typeof amount === "object" && amount !== null) {
      if (amount.ae !== undefined) return amount.ae.toString();
      if (amount.AE !== undefined) return amount.AE.toString();
      // Fallback to first available value
      const values = Object.values(amount);
      if (values.length > 0) return values[0].toString();
    }

    return "";
  };

  // Helper function to format token amount
  const formatTokenAmount = (
    tokenAmount: string | number | undefined
  ): string => {
    if (!tokenAmount) return "";
    return typeof tokenAmount === "string"
      ? tokenAmount
      : tokenAmount.toString();
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

  return (
    <div>
      <div className="flex flex-col gap-3 mb-4">
        {transactions.map((tx, idx) => {
          const txStyling = getTxStyling(tx.tx_type || "");

          return (
            <div
              key={tx.tx_hash || tx.id || idx}
              className={`flex justify-between items-center text-sm py-3 px-4 ${txStyling.bgColor} border ${txStyling.borderColor} rounded-xl transition-all duration-300 ${txStyling.hoverBg} hover:border-opacity-50`}
            >
              <div className="flex items-center gap-3">
                <AddressChip
                  address={tx.address || tx.account_address || ""}
                  linkToProfile={true}
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">{txStyling.icon}</span>
                    <span
                      className={`font-medium text-xs uppercase tracking-wide ${txStyling.textColor}`}
                    >
                      {getDisplayName(tx.tx_type || "")}
                    </span>
                  </div>
                  {tx.token_amount && (
                    <div className="text-white/60 text-xs mt-1">
                      {formatTokenAmount(tx.token_amount)} tokens
                    </div>
                  )}
                </div>

                <div className="text-right">
                  {tx.amount && formatAmount(tx.amount) && (
                    <div className={`font-semibold ${txStyling.textColor}`}>
                      {formatAmount(tx.amount)} AE
                    </div>
                  )}
                  <div className="text-white/60 text-xs mt-1">
                    {new Date(tx.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!transactions.length && !loading && (
        <div className="text-center py-12">
          <div className="text-white/40 text-lg mb-2">📈</div>
          <div className="text-white/60 text-sm">No transactions yet</div>
          <div className="text-white/40 text-xs mt-1">
            Trades will appear here once the token starts trading
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {hasMore && !loading && transactions.length > 0 && !onPageChange && (
        <button
          onClick={onLoadMore}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          Load more transactions
        </button>
      )}

      {/* Pagination Controls */}
      {onPageChange && totalPages > 1 && (
        <div className="mt-6 space-y-4">
          {/* Items per page selector */}
          <div className="flex items-center justify-between text-sm text-white/60">
            <div className="flex items-center gap-2">
              <span>Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange?.(Number(e.target.value))}
                className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm focus:outline-none focus:border-[#4ecdc4] transition-colors"
              >
                {itemsPerPageOptions.map((option) => (
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
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                    onClick={() => onPageChange(pageNum)}
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
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
