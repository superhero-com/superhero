import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { TokensService } from "@/api/generated/services/TokensService";
import { TokenHolderDto } from "@/api/generated/models/TokenHolderDto";
import { TokenDto } from "@/api/generated/models/TokenDto";
import { Decimal } from "@/libs/decimal";
import { toAe } from "@aeternity/aepp-sdk";
import AddressChip from "../AddressChip";
import TokenPriceFormatter from "@/features/shared/components/TokenPriceFormatter";

// Pagination response interface
interface PaginatedHoldersResponse {
  items: TokenHolderDto[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

interface TokenHoldersProps {
  token: TokenDto;
}

export default function TokenHolders({ token }: TokenHoldersProps) {
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch holders using React Query with server-side pagination
  const {
    data,
    isLoading: isFetching,
    error,
    refetch,
  } = useQuery<PaginatedHoldersResponse>({
    queryKey: [
      "TokensService.getHolders",
      token?.sale_address,
      itemsPerPage,
      currentPage,
    ],
    queryFn: async (): Promise<PaginatedHoldersResponse> => {
      if (!token?.sale_address) {
        return {
          items: [],
          meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
        };
      }

      try {
        const response = await TokensService.listTokenHolders({
          address: token.sale_address,
          limit: itemsPerPage,
          page: currentPage,
        });

        // Handle the response - it should be Pagination type but we need to cast it
        if (response && typeof response === "object" && "items" in response) {
          return response as PaginatedHoldersResponse;
        }

        // Fallback for different response formats
        if (Array.isArray(response)) {
          return {
            items: response,
            meta: {
              totalItems: response.length,
              totalPages: 1,
              currentPage: 1,
            },
          };
        }

        return {
          items: [],
          meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
        };
      } catch (error) {
        console.error("Failed to fetch token holders:", error);
        throw error;
      }
    },
    enabled: !!token?.sale_address,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  });

  // Table headers configuration
  const headers = useMemo(
    () => [
      { title: "Account", key: "address", sortable: false },
      { title: token.name || "Balance", key: "balance", sortable: false },
      { title: "%", key: "percentage", sortable: false },
    ],
    [token.name]
  );

  // Helper function to calculate percentage
  const getPercentage = (balance: string): Decimal => {
    if (!balance || !token.total_supply || token.total_supply === "0") {
      return Decimal.ZERO;
    }
    try {
      return Decimal.from(balance).div(token.total_supply).mul(100);
    } catch {
      return Decimal.ZERO;
    }
  };

  // Handle page updates
  const updatePage = (page: number) => {
    setCurrentPage(page);
  };

  const holders = data?.items || [];
  const totalItems = data?.meta?.totalItems || 0;
  const totalPages = data?.meta?.totalPages || 0;

  return (
    <div className="space-y-4">
      {/* Data Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-3 gap-4 px-6 py-4 border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wide">
          {headers.map((header) => (
            <div
              key={header.key}
              className={`truncate ${
                header.key === "percentage" ? "text-right" : ""
              }`}
            >
              {header.title}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-white/5">
          {holders.map((holder, idx) => {
            const percentage = getPercentage(holder.balance);

            return (
              <div
                key={holder.id}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                {/* Account */}
                <div className="flex items-center gap-3">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Account:
                  </div>
                  <div className="min-w-0 flex-1">
                    <AddressChip
                      address={holder.address}
                      linkToProfile={true}
                    />
                  </div>
                </div>

                {/* Balance */}
                <div className="flex items-center">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    Balance:
                  </div>
                  <div className="text-white">
                    <TokenPriceFormatter
                      hideSymbol={true}
                      token={token}
                      price={
                        holder.balance !== "NaN"
                          ? Decimal.from(toAe(holder.balance))
                          : Decimal.ZERO
                      }
                      className="text-white text-xs sm:text-base font-medium"
                    />
                  </div>
                </div>

                {/* Percentage */}

                <div className="flex items-center md:justify-end">
                  <div className="md:hidden text-xs text-white/60 mr-2 min-w-[60px]">
                    %:
                  </div>
                  <div className="min-w-[80px] text-right">
                    {percentage.gt("0.01") ? (
                      <div className="font-semibold text-white">
                        {percentage.prettify()}%
                      </div>
                    ) : percentage.isZero ? (
                      <div>0%</div>
                    ) : (
                      <div>0.01%</div>
                    )}
                    <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                      <div
                        className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] h-1 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(
                            Number(percentage.toString()),
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
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
        {!isFetching && !holders.length && (
          <div className="text-center py-12">
            <div className="text-white/40 text-lg mb-2">👥</div>
            <div className="text-white/60 text-sm">No holders found</div>
            <div className="text-white/40 text-xs mt-1">
              Token holders will appear here once tokens are distributed
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isFetching && (
          <div className="text-center py-12">
            <div className="text-red-400 text-lg mb-2">⚠️</div>
            <div className="text-red-400 text-sm">Failed to load holders</div>
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
                  <option
                    key={option}
                    value={option}
                    className="bg-gray-800 text-white"
                  >
                    {option}
                  </option>
                ))}
              </select>
              <span>items per page</span>
            </div>
            <div>
              Showing{" "}
              {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} to{" "}
              {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
              holders
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
