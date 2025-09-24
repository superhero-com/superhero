import { useEffect, useMemo, useState } from "react";
import { TrendminerApi } from "../api/backend";
import AeButton from "../components/AeButton";
import GlobalStatsAnalytics from "../components/Trendminer/GlobalStatsAnalytics";
import TokenMiniChart from "../components/Trendminer/TokenMiniChart";
import TrendingPillsCarousel from "../components/Trendminer/TrendingPillsCarousel";
import LatestTransactionsCarousel from "../components/Trendminer/LatestTransactionsCarousel";
import WalletConnectBtn from "../components/WalletConnectBtn";
import { CONFIG } from "../config";
import WebSocketClient from "../libs/WebSocketClient";
import { cn } from "@/lib/utils";

type TokenItem = {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
};

export default function Trending() {
  const [tags, setTags] = useState<
    Array<{ tag: string; score: number; source?: string }>
  >([]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [recent, setRecent] = useState<TokenItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orderBy, setOrderBy] = useState<
    | "trending_score"
    | "market_cap"
    | "name"
    | "price"
    | "holders_count"
    | "created_at"
  >("market_cap");
  const [orderDirection, setOrderDirection] = useState<"ASC" | "DESC">("DESC");
  const [timeframe, setTimeframe] = useState<"30D" | "7D" | "1D">("30D");
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const PAGE_SIZE = 100;

  const selectValue = useMemo(() => {
    if (orderBy === "created_at")
      return orderDirection === "ASC" ? "oldest" : "newest";
    return orderBy;
  }, [orderBy, orderDirection]);

  function setSortFromSelect(value: string) {
    if (value === "newest") {
      setOrderBy("created_at");
      setOrderDirection("DESC");
      return;
    }
    if (value === "oldest") {
      setOrderBy("created_at");
      setOrderDirection("ASC");
      return;
    }
    setOrderBy(value as any);
    setOrderDirection("DESC");
  }

  function toggleSort(
    key:
      | "trending_score"
      | "market_cap"
      | "name"
      | "price"
      | "holders_count"
      | "created_at"
  ) {
    if (orderBy === key) {
      setOrderDirection((d) => (d === "ASC" ? "DESC" : "ASC"));
    } else {
      setOrderBy(key);
      setOrderDirection(key === "name" ? "ASC" : "DESC");
    }
  }

  function SortHeader({
    label,
    keyName,
  }: {
    label: string;
    keyName:
      | "trending_score"
      | "market_cap"
      | "name"
      | "price"
      | "holders_count"
      | "created_at";
  }) {
    const active = orderBy === keyName;
    const arrow = active ? (orderDirection === "ASC" ? "▲" : "▼") : "";
    return (
      <button
        onClick={() => toggleSort(keyName)}
        className={`border-0 bg-transparent text-left p-0 text-xs cursor-pointer transition-all duration-200 text-white hover:text-white/90 ${
          active ? "opacity-100 font-bold" : "opacity-70 font-medium"
        }`}
        aria-label={`Sort by ${label}`}
      >
        {label} {arrow}
      </button>
    );
  }

  useEffect(() => {
    // Connect WS for live updates on trending lists
    if (CONFIG.TRENDMINER_WS_URL)
      WebSocketClient.connect(CONFIG.TRENDMINER_WS_URL);
    let cancelled = false;
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [tagsResp, tokensResp, recentResp] = await Promise.all([
          TrendminerApi.listTrendingTags({
            orderBy: "score",
            orderDirection: "DESC",
            limit: 50,
          }),
          TrendminerApi.listTokens({
            orderBy: orderBy as any,
            orderDirection,
            limit: PAGE_SIZE,
            page,
            search: search || undefined,
          }),
          TrendminerApi.listTokens({
            orderBy: "created_at" as any,
            orderDirection: "DESC",
            limit: 6,
            page: 1,
          }),
        ]);
        const tagsItems = Array.isArray(tagsResp?.items)
          ? tagsResp.items
          : Array.isArray(tagsResp)
          ? tagsResp
          : [];
        const mappedTags = tagsItems.map((it: any) => ({
          tag: it.tag ?? it.name ?? "",
          score: Number(it.score ?? it.value ?? 0),
          source: it.source || it.platform || undefined,
        }));
        const list: TokenItem[] = tokensResp?.items ?? tokensResp ?? [];
        const recentList: TokenItem[] = recentResp?.items ?? recentResp ?? [];
        if (!cancelled) {
          setTags(mappedTags);
          setTokens(list);
          setRecent(recentList);
          const apiTotalPages = tokensResp?.meta?.totalPages;
          const inferred = list.length === PAGE_SIZE ? page + 1 : page;
          setTotalPages(apiTotalPages ?? inferred);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load trending data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [orderBy, orderDirection, search, page]);

  // Reset to page 1 when sort or search changes
  useEffect(() => {
    setPage(1);
  }, [orderBy, orderDirection, search]);

  // Build a mapping of trending tags -> tokenized token info (if exists)
  useEffect(() => {
    let cancelled = false;
    async function checkTags() {
      const top = tags.slice(0, 20);
      const results = await Promise.allSettled(
        top.map(async (t) => {
          try {
            const tok: any = await TrendminerApi.getToken(t.tag);
            return [t.tag, tok] as const;
          } catch {
            return [t.tag, null] as const;
          }
        })
      );
      if (cancelled) return;
      const map: Record<string, TokenItem> = {};
      results.forEach((r) => {
        if (r.status === "fulfilled" && r.value && r.value[1]) {
          const [tag, tok] = r.value as any;
          map[tag] = tok;
        }
      });
      setTagTokenMap(map);
    }
    if (tags.length) checkTags();
    return () => {
      cancelled = true;
    };
  }, [tags]);

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

  // Responsive layout
  return (
    <div className="max-w-[1400px] mx-auto min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Banner */}
      <div className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-b border-white/10 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-center text-2xl sm:text-3xl lg:text-left lg:text-4xl font-bold leading-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                Tokenize Trends.
                <br />
                Own the Hype.
                <br />
                Build Communities.
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
                <AeButton
                  variant="primary"
                  size="md"
                  rounded
                  onClick={() => (window.location.href = "/trendminer/create")}
                >
                  Tokenize a Trend
                </AeButton>
                <AeButton
                  variant="secondary"
                  size="md"
                  rounded
                  outlined
                  onClick={() =>
                    window.open("https://wallet.superhero.com", "_blank")
                  }
                >
                  Get Superhero Wallet ↘
                </AeButton>
                <div className="flex gap-2 sm:gap-3">
                  <AeButton
                    variant="accent"
                    size="md"
                    rounded
                    onClick={() => (window.location.href = "/trendminer/daos")}
                  >
                    Explore DAOs
                  </AeButton>
                  <AeButton
                    variant="ghost"
                    size="md"
                    rounded
                    onClick={() =>
                      (window.location.href = "/trendminer/invite")
                    }
                  >
                    Invite & Earn
                  </AeButton>
                </div>
                <div className="w-full sm:w-auto">
                  <WalletConnectBtn />
                </div>
              </div>
              <div className="text-sm text-white/75 mt-2.5 max-w-[720px] overflow-hidden text-ellipsis leading-relaxed">
                Tokenized trends are community tokens launched on a bonding
                curve. Price moves with buys/sells, no order books. Each token
                mints a DAO treasury that can fund initiatives via on-chain
                votes. Connect your wallet to trade and participate.
              </div>
            </div>
            <div className="min-w-[300px] flex-shrink-0 lg:mt-8">
              <GlobalStatsAnalytics />
            </div>
          </div>
        </div>
      </div>

      <LatestTransactionsCarousel />

      <TrendingPillsCarousel tagTokenMap={tagTokenMap} />

      {/* Main content */}
      <div className="max-w-[1400px] mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left: Tokenized Trends */}
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <div className="text-xl sm:text-2xl font-bold text-white">
                Tokenized Trends
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <select
                  className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                  value={selectValue as any}
                  onChange={(e) => setSortFromSelect(e.target.value)}
                >
                  <option value="trending_score">Hot</option>
                  <option value="market_cap">Market Cap</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="holders_count">Holders</option>
                </select>
                <input
                  id="trend-search"
                  name="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="px-3 py-2 w-full sm:min-w-[200px] sm:max-w-[280px] bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400 placeholder-white/50"
                />
                <select
                  className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                >
                  <option value="30D">30D</option>
                  <option value="7D">7D</option>
                  <option value="1D">1D</option>
                </select>
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl overflow-hidden">
              {/* Desktop Table Header - hidden on mobile */}
              <div className="hidden lg:grid grid-cols-[60px_1fr_100px_120px_80px_120px] gap-8 p-4 bg-white/10 border-b border-white/10 text-sm font-semibold text-white/80">
                <div>
                  <SortHeader label="Rank" keyName="market_cap" />
                </div>
                <div>
                  <SortHeader label="# Token" keyName="name" />
                </div>
                <div>
                  <SortHeader label="Price" keyName="price" />
                </div>
                <div>
                  <SortHeader label="Market Cap" keyName="market_cap" />
                </div>
                <div>
                  <SortHeader label="Holders" keyName="holders_count" />
                </div>
                <div>
                  <SortHeader label="Mini Chart" keyName="trending_score" />
                </div>
              </div>

              {/* Table Body */}
              <div className="grid gap-1 lg:min-w-fit">
                {tokens.map((t, idx) => (
                  <a
                    key={t.address}
                    href={`/trendminer/tokens/${encodeURIComponent(
                      t.name || t.address
                    )}`}
                    className="no-underline text-white hover:bg-white/5 transition-colors"
                  >
                    {/* Desktop Table Row */}
                    <div className="hidden lg:grid grid-cols-[60px_1fr_100px_140px_80px_120px] gap-8 p-4 items-center border-b border-white/5 hover:border-white/10">
                      <div className="text-sm font-medium text-white/90">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </div>
                      <div className="text-sm font-semibold text-white">
                        #{t.name || t.symbol}{" "}
                        {t.symbol ? (
                          <span className="opacity-70">({`#${t.symbol}`})</span>
                        ) : null}
                      </div>
                      <div className="text-sm font-mono text-white/90">
                        {normalizeAe(Number(t.price ?? 0)).toFixed(6)} AE
                      </div>
                      <div className="text-sm font-mono text-white/90">
                        {normalizeAe(
                          Number(t.market_cap ?? 0)
                        ).toLocaleString()}{" "}
                        AE
                      </div>
                      <div className="text-sm text-white/90">
                        {t.holders_count ?? 0}
                      </div>
                      <div className="flex justify-center">
                        <TokenMiniChart
                          address={t.sale_address || t.address}
                          width={120}
                          height={28}
                          stroke="#ff6d15"
                          timeframe={timeframe}
                        />
                      </div>
                    </div>

                    {/* Mobile Card Layout */}
                    {/* <div className="lg:hidden p-4 border-b border-white/5 hover:border-white/10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full font-medium">
                            #{(page - 1) * PAGE_SIZE + idx + 1}
                          </span>
                          <div className="text-sm font-semibold text-white">
                            #{t.name || t.symbol}
                          </div>
                        </div>
 
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div>
                          <span className="text-white/60 block">Price</span>
                          <span className="font-mono text-white/90">
                            {normalizeAe(Number(t.price ?? 0)).toFixed(6)} AE
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60 block">
                            Market Cap
                          </span>
                          <span className="font-mono text-white/90">
                            {normalizeAe(
                              Number(t.market_cap ?? 0)
                            ).toLocaleString()}{" "}
                            AE
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60 block">Holders</span>
                          <span className="text-white/90">
                            {t.holders_count ?? 0}
                          </span>
                        </div>
                        <div>
                          <span className="text-white/60 block">Chart</span>
                          <div className="mt-1">
                            <TokenMiniChart
                              address={t.sale_address || t.address}
                              width={80}
                              height={20}
                              stroke="#ff6d15"
                              timeframe={timeframe}
                            />
                          </div>
                        </div>
                      </div>
                    </div> */}
                    <div
                      className={cn(
                        "lg:hidden  border border-white/10 rounded-2xl p-4 m-2 cursor-pointer transition-all duration-200",
                        "sm:p-3 sm:mb-2",
                        "hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.15)] hover:border-orange-500/30",
                        "active:translate-y-0 active:transition-transform active:duration-100"
                      )}
                    >
                      <div className="flex items-center justify-between mb-3 sm:mb-2.5">
                        <span className="text-xs bg-white/10 text-white/90 px-2 py-1 rounded-full font-medium">
                          #{(page - 1) * PAGE_SIZE + idx + 1}
                        </span>
                        <div className="flex-1 mx-3 sm:mx-2">
                          <div className="text-base font-bold text-[var(--standard-font-color)] leading-tight mb-0.5 sm:text-[15px]">
                            #{t.name || t.symbol}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-row items-center justify-between">
                        <div>Price:</div>
                        <div className="text-sm font-semibold text-[var(--custom-links-color)] font-mono text-right sm:text-xs">
                          {normalizeAe(Number(t.price ?? 0)).toFixed(6)} AE
                        </div>
                      </div>

                      <div className="flex justify-between mb-3 sm:mb-2.5">
                        <div className="flex flex-col items-start">
                          <span className="text-white/60 block">
                            Market Cap
                          </span>
                          <span className="text-xs font-semibold text-[var(--standard-font-color)] font-mono sm:text-[11px]">
                            {normalizeAe(
                              Number(t.market_cap ?? 0)
                            ).toLocaleString()}{" "}
                            AE
                          </span>
                        </div>
                        <div className="flex flex-col items-start items-center">
                          <span className="text-white/60 block">Holders</span>
                          <span className="text-xs font-semibold text-[var(--standard-font-color)] font-mono sm:text-[11px]">
                            {t.holders_count ?? 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-center items-center h-10 bg-white/5 rounded-lg overflow-hidden sm:h-9">
                        <TokenMiniChart
                          address={t.sale_address || t.address}
                          width={280}
                          height={40}
                          stroke="#ff6d15"
                          timeframe={timeframe}
                        />
                      </div>
                    </div>
                  </a>
                ))}
                {loading && (
                  <div className="p-4 text-center text-white/70">Loading…</div>
                )}
                {error && (
                  <div className="p-4 text-center text-red-400">{error}</div>
                )}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-center mt-4">
              <AeButton
                variant="ghost"
                size="sm"
                rounded
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-full sm:w-auto"
              >
                Previous
              </AeButton>
              <span className="text-xs sm:text-sm text-white/80 py-2">
                Page {page} of {totalPages}
              </span>
              <AeButton
                variant="ghost"
                size="sm"
                rounded
                disabled={totalPages > 0 ? page >= totalPages : false}
                onClick={() =>
                  setPage((p) => Math.min(totalPages || p + 1, p + 1))
                }
                className="w-full sm:w-auto"
              >
                Next
              </AeButton>
            </div>
          </div>

          {/* Right: Explore Trends */}
          <div className="bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-4 sm:p-6 h-fit xl:mt-0 mt-6">
            <div className="text-lg sm:text-xl font-bold text-white mb-4">
              Explore Trends
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <select
                className="px-2.5 py-1.5 bg-gray-800 text-white border border-gray-600 rounded-full text-sm focus:outline-none focus:border-purple-400"
                defaultValue={"Most Trending"}
              >
                <option>Most Trending</option>
                <option>Latest</option>
              </select>
              <input
                id="explore-search"
                name="search"
                placeholder="Search trends"
                className="px-3 py-2 flex-1 bg-gray-800 text-white border border-gray-600 rounded-full text-sm focus:outline-none focus:border-purple-400 placeholder-white/50"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
              {tags.slice(0, 12).map((it) => {
                const tok = tagTokenMap[it.tag];
                return (
                  <div
                    key={it.tag}
                    className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <div className="font-semibold text-white mb-2 text-sm sm:text-base">
                      #{it.tag.toUpperCase()}
                    </div>
                    <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
                      {!tok && (
                        <>
                          <span className="text-green-400 font-medium">
                            ↑ {it.score.toLocaleString()}
                          </span>
                          {it.source && (
                            <a
                              href={`https://x.com/search?q=${encodeURIComponent(
                                "#" + it.tag
                              )}&src=typed_query`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300 no-underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              via {it.source}
                            </a>
                          )}
                        </>
                      )}
                      {tok ? (
                        <>
                          <div className="flex flex-col gap-1 min-w-0 flex-1">
                            <span className="text-white/90 font-mono text-xs">
                              {normalizeAe(Number(tok.price ?? 0)).toFixed(6)}{" "}
                              AE
                            </span>
                            <span className="text-white/70 text-xs">
                              Holders: {tok.holders_count ?? 0}
                            </span>
                          </div>
                          <AeButton
                            variant="accent"
                            size="xs"
                            outlined
                            onClick={() =>
                              (window.location.href = `/trendminer/tokens/${encodeURIComponent(
                                tok.name || tok.address
                              )}`)
                            }
                            className="flex-shrink-0"
                          >
                            View
                          </AeButton>
                        </>
                      ) : (
                        <AeButton
                          variant="accent"
                          size="xs"
                          rounded
                          onClick={() =>
                            (window.location.href = `/trendminer/create?new=${encodeURIComponent(
                              it.tag
                            )}`)
                          }
                          className="px-2 py-1 rounded-full text-xs flex-shrink-0"
                        >
                          Tokenize
                        </AeButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
