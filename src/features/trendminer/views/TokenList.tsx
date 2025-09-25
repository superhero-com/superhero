import { useEffect, useMemo, useState, useRef } from "react";
import { TrendminerApi } from "../../../api/backend";
import { TokenDto } from "../../../api/generated";
import AeButton from "../../../components/AeButton";
import GlobalStatsAnalytics from "../../../components/Trendminer/GlobalStatsAnalytics";
import TrendingPillsCarousel from "../../../components/Trendminer/TrendingPillsCarousel";
import LatestTransactionsCarousel from "../../../components/Trendminer/LatestTransactionsCarousel";
import WalletConnectBtn from "../../../components/WalletConnectBtn";
import { CONFIG } from "../../../config";
import WebSocketClient from "../../../libs/WebSocketClient";
import { TokenListTable } from "..";

type TrendingTagItem = {
  tag: string;
  score: number;
  source?: string;
};

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

type SelectOptions<T> = Array<{
  title: string;
  disabled?: boolean;
  value: T;
}>;

const SORT = {
  marketCap: 'market_cap',
  newest: 'newest',
  oldest: 'oldest',
  holdersCount: 'holders_count',
  trendingScore: 'trending_score',
} as const;

type OrderByOption = typeof SORT[keyof typeof SORT];
type CollectionOption = 'all' | 'word' | 'number';

export default function TokenList() {
  const [tags, setTags] = useState<TrendingTagItem[]>([]);
  const [collection, setCollection] = useState<CollectionOption>('all');
  const [orderBy, setOrderBy] = useState<OrderByOption>(SORT.trendingScore);
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<{ pages: Array<{ items: TokenDto[] }> } | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagTokenMap, setTagTokenMap] = useState<Record<string, TokenItem>>({});
  const [page, setPage] = useState(1);
  const loadMoreBtn = useRef<HTMLButtonElement>(null);

  // WebSocket subscription
  const [newTokenListenerSubscription, setNewTokenListenerSubscription] = useState<(() => void) | null>(null);

  const orderByOptions: SelectOptions<OrderByOption> = [
    {
      title: 'Trending Score',
      value: SORT.trendingScore,
    },
    {
      title: 'Market Cap',
      value: SORT.marketCap,
    },
    {
      title: 'Newest',
      value: SORT.newest,
    },
    {
      title: 'Oldest',
      value: SORT.oldest,
    },
    {
      title: 'Holders Count',
      value: SORT.holdersCount,
    },
  ];

  const collectionOptions: SelectOptions<CollectionOption> = [
    {
      title: 'All Tokens',
      value: 'all',
    },
    {
      title: 'Word Tokens',
      value: 'word',
    },
    {
      title: 'Number Tokens',
      value: 'number',
    },
  ];

  const activeCollectionOption = useMemo(() =>
    collectionOptions.find((option) => option.value === collection),
    [collection]
  );

  const activeSortOption = useMemo(() =>
    orderByOptions.find((option) => option.value === orderBy),
    [orderBy]
  );

  const orderByMapped = useMemo(() => {
    if (orderBy === SORT.newest || orderBy === SORT.oldest) {
      return 'created_at';
    }
    return orderBy;
  }, [orderBy]);

  const orderDirection = useMemo((): 'ASC' | 'DESC' => {
    return orderBy === SORT.oldest ? 'ASC' : 'DESC';
  }, [orderBy]);

  function updateCollection(val: CollectionOption) {
    setCollection(val);
    setPage(1);
  }

  function updateOrderBy(val: OrderByOption) {
    setOrderBy(val);
    setPage(1);
  }

  async function fetchTokens(pageParam = 1, isInitial = false) {
    if (isInitial) {
      setIsFetching(true);
      setError(null);
    }
    
    try {
      const response = await TrendminerApi.listTokens({
        orderBy: orderByMapped as any,
        orderDirection,
        collection: collection === 'all' ? undefined : collection,
        search: search || undefined,
        limit: 20,
        page: pageParam,
      });

      const newItems = response?.items || [];
      const hasMore = response?.meta?.currentPage < response?.meta?.totalPages;

      if (isInitial || pageParam === 1) {
        setData({ pages: [{ items: newItems }] });
      } else {
        setData(prev => ({
          pages: prev ? [...prev.pages, { items: newItems }] : [{ items: newItems }]
        }));
      }

      setHasNextPage(hasMore);
      setPage(pageParam);
    } catch (e: any) {
      setError(e?.message || "Failed to load tokens");
    } finally {
      if (isInitial) {
        setIsFetching(false);
      }
    }
  }

  const fetchNextPage = () => {
    if (hasNextPage && !isFetching) {
      fetchTokens(page + 1);
    }
  };

  // Load initial data
  useEffect(() => {
    fetchTokens(1, true);
  }, [orderBy, orderByMapped, collection, search, orderDirection]);

  // Load trending tags
  useEffect(() => {
    let cancelled = false;
    async function loadTags() {
      try {
        const tagsResp = await TrendminerApi.listTrendingTags({
          orderBy: "score",
          orderDirection: "DESC",
          limit: 50,
        });
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
        if (!cancelled) {
          setTags(mappedTags);
        }
      } catch (e) {
        console.error("Failed to load trending tags:", e);
      }
    }
    loadTags();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build tag-token mapping
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
          // Convert TokenDto to TokenItem
          map[tag] = {
            address: tok.address,
            name: tok.name,
            symbol: tok.symbol,
            price: Number(tok.price || 0),
            market_cap: Number(tok.market_cap || 0),
            holders_count: tok.holders_count || 0,
            sale_address: tok.sale_address,
            trending_score: tok.trending_score,
          };
        }
      });
      setTagTokenMap(map);
    }
    if (tags.length) checkTags();
    return () => {
      cancelled = true;
    };
  }, [tags]);

  // WebSocket setup
  useEffect(() => {
    if (CONFIG.TRENDMINER_WS_URL) {
      WebSocketClient.connect(CONFIG.TRENDMINER_WS_URL);
    }

    const subscription = WebSocketClient.subscribe('TokenCreated', () => {
      setTimeout(() => {
        fetchTokens(1, true);
      }, 4000);
    });

    setNewTokenListenerSubscription(() => subscription);

    return () => {
      if (subscription) {
        subscription();
      }
    };
  }, []);

  // Intersection observer for infinite loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.intersectionRatio === 1) {
          fetchNextPage();
        }
      },
      { threshold: 1 }
    );

    if (loadMoreBtn.current) {
      observer.observe(loadMoreBtn.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetching]);

  function normalizeAe(n: number): number {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  }

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
          {/* Left: Token List */}
          <div className="min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Tokenized Trends
              </h2>

              {/* FILTERS */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Collection Filter */}
                <select
                  className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                  value={collection}
                  onChange={(e) => updateCollection(e.target.value as CollectionOption)}
                >
                  {collectionOptions.map((option) => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                      {option.title}
                    </option>
                  ))}
                </select>

                {/* OrderBy Filter */}
                <select
                  className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400"
                  value={orderBy}
                  onChange={(e) => updateOrderBy(e.target.value as OrderByOption)}
                >
                  {orderByOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.title}
                    </option>
                  ))}
                </select>

                {/* Search */}
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tokens"
                  className="px-3 py-2 w-full sm:min-w-[200px] sm:max-w-[280px] bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400 placeholder-white/50"
                />
              </div>
            </div>

            {/* Message Box for no results */}
            {(!data?.pages?.length || !data?.pages[0].items.length) && !isFetching && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center text-red-400 mb-4">
                <h3 className="font-semibold mb-2">No Token Sales</h3>
                <p>No tokens found matching your criteria.</p>
              </div>
            )}

            {/* Token List Table */}
            <TokenListTable pages={data?.pages} loading={isFetching} />
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

        {/* Load More Button */}
        {hasNextPage && (
          <div className="text-center pt-2 pb-4">
            <button
              ref={loadMoreBtn}
              onClick={fetchNextPage}
              disabled={isFetching}
              className="px-6 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 rounded-full text-white font-medium transition-colors"
            >
              {isFetching ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
