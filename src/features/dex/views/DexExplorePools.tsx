import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DexService, PairDto } from "../../../api/generated";
import { TokenChip } from "../../../components/TokenChip";

// Define the actual API response structure
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function DexExplorePools() {
  const navigate = useNavigate();

  const [sort, setSort] = useState<"transactions_count" | "created_at">(
    "transactions_count"
  );
  const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const result = await DexService.listAllPairs({
        page: page,
        limit: limit,
        orderBy: sort,
        orderDirection: sortDirection,
        search,
      });
      return result as unknown as PaginatedResponse<PairDto>;
    },
    queryKey: [
      "DexService.listAllPairs",
      sort,
      sortDirection,
      search,
      page,
      limit,
    ],
  });

  return (
    <div className="p-0">
      {/* Main Content Card */}
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-standard-font-color m-0 mb-3 bg-primary-gradient bg-clip-text text-transparent">
            Explore Pools
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Explore trading pairs and their performance metrics across the DEX.
          </p>
        </div>

        <div className="overflow-x-auto">
          {/* Responsive Filter Controls */}
          <div className="bg-white/[0.03] border border-[var(--glass-border)] rounded-xl p-4 md:px-4 md:py-3 mb-3 md:mb-5 backdrop-blur-[15px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            
            {/* Filter Layout - Mobile: Column, Desktop: Row */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4 mb-2.5">
              
              {/* Left Section: Sort Controls */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-3">
                {/* Desktop Filter Label - Hidden on Mobile */}
                <div className="hidden md:flex items-center gap-1.5">
                  <div className="w-0.5 h-4 bg-gradient-to-b from-[var(--primary-color)] to-[var(--accent-color)] rounded-sm"></div>
                  <span className="text-sm font-semibold text-[var(--standard-font-color)] bg-gradient-to-r from-[var(--primary-color)] to-[var(--accent-color)] bg-clip-text text-transparent">
                    Filter & Sort
                  </span>
                </div>
                
                {/* Sort Controls */}
                <div className="flex items-center justify-between md:justify-start gap-1.5">
                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as any)}
                      className="appearance-none py-1.5 px-3 pr-7 rounded-lg bg-[var(--glass-bg)] text-[var(--standard-font-color)] border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium cursor-pointer transition-all duration-300 outline-none min-w-[100px] focus:border-[var(--accent-color)] focus:shadow-[0_0_0_2px_rgba(76,175,80,0.1)]"
                    >
                      <option value="transactions_count">Tx count</option>
                      <option value="created_at">Created at</option>
                    </select>
                    {/* Custom Dropdown Arrow */}
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--light-font-color)] text-xs font-semibold flex items-center justify-center w-4 h-4 bg-white/10 rounded transition-all duration-300">
                      ▼
                    </div>
                  </div>

                  {/* Sort Direction Button */}
                  <button
                    onClick={() =>
                      setSortDirection(sortDirection === "ASC" ? "DESC" : "ASC")
                    }
                    className={`py-1.5 px-2 rounded-md border border-[var(--glass-border)] backdrop-blur-[10px] transition-all duration-300 text-[13px] font-semibold min-w-[28px] h-7 flex items-center justify-center outline-none hover:scale-105 hover:shadow-[0_3px_8px_rgba(76,175,80,0.3)] active:scale-95 ${
                      sortDirection === "ASC"
                        ? "bg-[var(--accent-color)] text-white"
                        : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] hover:bg-[var(--accent-color)] hover:text-white"
                    }`}
                    title={sortDirection === "ASC" ? "Sort Ascending" : "Sort Descending"}
                  >
                    {sortDirection === "ASC" ? "↑" : "↓"}
                  </button>

                  {/* Items per page - Mobile */}
                  <div className="flex md:hidden items-center gap-1.5">
                    <span className="text-[13px] text-[var(--light-font-color)] font-medium">Show:</span>
                    <div className="relative">
                      <select
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                        className="appearance-none py-1.5 px-3 pr-7 rounded-lg bg-[var(--glass-bg)] text-[var(--standard-font-color)] border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium cursor-pointer transition-all duration-300 outline-none min-w-[70px] focus:border-[var(--accent-color)] focus:shadow-[0_0_0_2px_rgba(76,175,80,0.1)]"
                      >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--light-font-color)] text-xs font-semibold flex items-center justify-center w-4 h-4 bg-white/10 rounded transition-all duration-300">
                        ▼
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section: Search + Desktop Items per page */}
              <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                {/* Search Input */}
                <div className="relative flex-1 md:max-w-[400px] min-w-[200px]">
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--light-font-color)] text-sm pointer-events-none opacity-60 z-10">
                    🔍
                  </div>
                  <input
                    placeholder="Search pools..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full py-2 pl-8 pr-3 rounded-lg bg-[var(--glass-bg)] text-[var(--standard-font-color)] border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-normal transition-all duration-300 outline-none focus:border-[var(--accent-color)] focus:shadow-[0_0_0_2px_rgba(76,175,80,0.1)] focus:bg-white/[0.08]"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-white/10 border-0 rounded-full w-5 h-5 flex items-center justify-center cursor-pointer text-[var(--light-font-color)] text-[10px] transition-all duration-300 outline-none hover:bg-red-500/20 hover:text-red-400 hover:scale-110 active:scale-95"
                      title="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Items per page + Results Counter - Desktop */}
                <div className="hidden md:flex items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-[13px] text-[var(--light-font-color)] font-medium">Show:</span>
                    <div className="relative">
                      <select
                        value={limit}
                        onChange={(e) => {
                          setLimit(Number(e.target.value));
                          setPage(1);
                        }}
                        className="appearance-none py-1.5 px-3 pr-7 rounded-lg bg-[var(--glass-bg)] text-[var(--standard-font-color)] border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium cursor-pointer transition-all duration-300 outline-none min-w-[70px] focus:border-[var(--accent-color)] focus:shadow-[0_0_0_2px_rgba(76,175,80,0.1)]"
                      >
                        <option value={10}>10</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--light-font-color)] text-xs font-semibold flex items-center justify-center w-4 h-4 bg-white/10 rounded transition-all duration-300">
                        ▼
                      </div>
                    </div>
                  </div>
                  
                  {/* Results Counter */}
                  <div className="flex items-center gap-1.5 bg-[var(--accent-color)]/10 px-2.5 py-1.5 rounded-2xl border border-[var(--accent-color)]/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse"></div>
                    <span className="text-[11px] text-[var(--accent-color)] font-semibold">
                      {data?.meta.totalItems} {data?.meta.totalItems === 1 ? "pool" : "pools"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Results Counter */}
            <div className="md:hidden flex justify-end">
              <div className="flex items-center gap-1.5 bg-[var(--accent-color)]/10 px-2.5 py-1.5 rounded-2xl border border-[var(--accent-color)]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-color)] animate-pulse"></div>
                <span className="text-[11px] text-[var(--accent-color)] font-semibold">
                  {data?.meta.totalItems} {data?.meta.totalItems === 1 ? "pool" : "pools"}
                </span>
              </div>
            </div>

            {/* Content: Mobile Cards or Desktop Table */}
            <div className="mt-3">
              {/* Mobile Card Layout */}
              <div className="md:hidden flex flex-col gap-3">
                {data?.items.map((pair: PairDto) => (
                  <div
                    key={pair.address}
                    className="bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl p-4 backdrop-blur-[10px] cursor-pointer transition-all duration-300 active:scale-[0.98] active:bg-white/[0.05]"
                    onClick={() => navigate(`/dex/explore/pools/${pair.address}`)}
                  >
                    {/* Pool Pair Header */}
                    <div className="flex flex-col items-center justify-between mb-3 pb-3 border-b border-white/5">
                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dex/explore/tokens/${pair.token0}`);
                          }}
                          className="bg-transparent border-0 cursor-pointer p-0"
                        >
                          <TokenChip token={pair.token0} />
                        </button>
                        <span className="text-[var(--light-font-color)] mx-1 text-sm font-medium">/</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dex/explore/tokens/${pair.token1}`);
                          }}
                          className="bg-transparent border-0 cursor-pointer p-0"
                        >
                          <TokenChip token={pair.token1} />
                        </button>
                      </div>

                      {/* Transaction Count Badge */}
                      <div className="bg-[var(--accent-color)]/10 px-2 py-1 rounded-xl border border-[var(--accent-color)]/20 mt-2">
                        <span className="text-xs text-[var(--accent-color)] font-semibold">
                          {pair.transactions_count || 0} Tx
                        </span>
                      </div>
                    </div>

                    {/* Pool Statistics Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                        <div className="text-[11px] text-[var(--light-font-color)] font-medium mb-1 uppercase tracking-wider">
                          TVL (USD)
                        </div>
                        <div className="text-sm text-[var(--standard-font-color)] font-semibold">-</div>
                      </div>
                      <div className="bg-white/[0.03] p-3 rounded-lg border border-white/5">
                        <div className="text-[11px] text-[var(--light-font-color)] font-medium mb-1 uppercase tracking-wider">
                          Volume
                        </div>
                        <div className="text-sm text-[var(--standard-font-color)] font-semibold">-</div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dex/swap?from=${pair.token0.address}&to=${pair.token1.address}`);
                        }}
                        className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none active:scale-95 active:bg-[var(--button-gradient)] active:text-white"
                      >
                        🔄 Swap
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dex/pool/add?from=${pair.token0.address}&to=${pair.token1.address}`);
                        }}
                        className="flex-1 py-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-sm font-semibold backdrop-blur-[10px] transition-all duration-300 outline-none active:scale-95 active:bg-[var(--button-gradient)] active:text-white"
                      >
                        ➕ Add Liquidity
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table Layout */}
              <div className="hidden md:block bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl overflow-hidden backdrop-blur-[10px] overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-white/5 border-b border-[var(--glass-border)]">
                      <th className="text-left py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">Pair</th>
                      <th className="text-center py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">Tx</th>
                      <th className="text-right py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">TVL (USD)</th>
                      <th className="text-right py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">Volume</th>
                      <th className="text-center py-4 px-3 text-sm text-[var(--light-font-color)] font-semibold tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.items.map((pair: PairDto) => (
                      <tr
                        key={pair.address}
                        className="border-b border-white/5 transition-all duration-300 hover:bg-white/[0.03] cursor-pointer"
                        onClick={() => navigate(`/dex/explore/pools/${pair.address}`)}
                      >
                        <td className="py-4 px-3 flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dex/explore/tokens/${pair.token0}`);
                            }}
                            className="text-[var(--accent-color)] bg-transparent border-0 cursor-pointer text-[15px] font-semibold transition-all duration-300 hover:underline hover:-translate-y-px"
                          >
                            <TokenChip token={pair.token0} />
                          </button>
                          <span className="text-[var(--light-font-color)] mx-1 text-sm">/</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dex/explore/tokens/${pair.token1}`);
                            }}
                            className="text-[var(--accent-color)] bg-transparent border-0 cursor-pointer text-[15px] font-semibold transition-all duration-300 hover:underline hover:-translate-y-px"
                          >
                            <TokenChip token={pair.token1} />
                          </button>
                        </td>
                        <td className="text-center py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">
                          {pair.transactions_count || 0}
                        </td>
                        <td className="text-right py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">-</td>
                        <td className="text-right py-4 px-3 text-sm text-[var(--standard-font-color)] font-medium">-</td>
                        <td className="text-center py-4 px-3">
                          <div className="flex gap-1.5 justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dex/swap?from=${pair.token0.address}&to=${pair.token1.address}`);
                              }}
                              className="py-1.5 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-xs font-medium backdrop-blur-[10px] transition-all duration-300 hover:bg-[var(--button-gradient)] hover:-translate-y-px hover:text-white"
                            >
                              Swap
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dex/pool/add?from=${pair.token0.address}&to=${pair.token1.address}`);
                              }}
                              className="py-1.5 px-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer text-xs font-medium backdrop-blur-[10px] transition-all duration-300 hover:bg-[var(--button-gradient)] hover:-translate-y-px hover:text-white"
                            >
                              Add
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Responsive Pagination Controls */}
            {data && data.meta.totalItems > 0 && (
              <div className="flex flex-col md:flex-row justify-between items-center mt-5 p-3 md:py-4 md:px-5 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl backdrop-blur-[10px] gap-3 md:gap-0">
                {/* Pagination Info */}
                <div className="flex items-center gap-2 order-2 md:order-1">
                  <span className="text-xs md:text-sm text-[var(--light-font-color)] font-medium text-center md:text-left">
                    Showing {(page - 1) * limit + 1}-{Math.min(page * limit, data.meta.totalItems)} of {data.meta.totalItems} pools
                  </span>
                </div>

                {/* Pagination Buttons */}
                <div className="flex items-center gap-1.5 md:gap-2 order-1 md:order-2 flex-wrap justify-center md:justify-start">
                  {/* First Page Button - Desktop Only */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className={`hidden md:block py-2 px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium transition-all duration-300 outline-none ${
                      page === 1
                        ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                        : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px"
                    }`}
                    title="First page"
                  >
                    ⇤ First
                  </button>

                  {/* Previous Page Button */}
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[80px] md:min-w-auto ${
                      page === 1
                        ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                        : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px active:scale-95"
                    }`}
                    title="Previous page"
                  >
                    ← Prev
                  </button>

                  {/* Page Number Display */}
                  <div className="flex items-center gap-2 px-3">
                    <span className="text-sm text-[var(--standard-font-color)] font-semibold bg-[var(--accent-color)]/10 py-1 px-2 rounded-md border border-[var(--accent-color)]/20">
                      {page}
                    </span>
                    <span className="text-sm text-[var(--light-font-color)]">of {Math.ceil(data.meta.totalItems / limit)}</span>
                  </div>

                  {/* Next Page Button */}
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= Math.ceil(data.meta.totalItems / limit)}
                    className={`py-2 px-2 md:px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-sm md:text-[13px] font-medium transition-all duration-300 outline-none min-w-[60px] md:min-w-auto ${
                      page >= Math.ceil(data.meta.totalItems / limit)
                        ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                        : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px active:scale-95"
                    }`}
                    title="Next page"
                  >
                    Next →
                  </button>

                  {/* Last Page Button - Desktop Only */}
                  <button
                    onClick={() => setPage(Math.ceil(data.meta.totalItems / limit))}
                    disabled={page >= Math.ceil(data.meta.totalItems / limit)}
                    className={`hidden md:block py-2 px-3 rounded-lg border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium transition-all duration-300 outline-none ${
                      page >= Math.ceil(data.meta.totalItems / limit)
                        ? "bg-white/5 text-[var(--light-font-color)] cursor-not-allowed opacity-50"
                        : "bg-[var(--glass-bg)] text-[var(--standard-font-color)] cursor-pointer hover:bg-[var(--accent-color)] hover:text-white hover:-translate-y-px"
                    }`}
                    title="Last page"
                  >
                    Last ⇥
                  </button>
                </div>
              </div>
            )}

            {/* No Results Message */}
            {data?.items.length === 0 && !isLoading && (
              <div className="text-center py-15 bg-white/[0.02] border border-[var(--glass-border)] rounded-2xl backdrop-blur-[10px] mt-5">
                <div className="text-[var(--light-font-color)] text-base font-medium mb-2">No pools found</div>
                <div className="text-[var(--light-font-color)] text-sm opacity-70">Try adjusting your search criteria</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}