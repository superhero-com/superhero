import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Backend, TrendminerApi } from "../../api/backend";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import WalletOverviewCard from "@/components/wallet/WalletOverviewCard";
import { useAeSdk } from "../../hooks/useAeSdk";
import { useToast } from "../ToastProvider";
import Sparkline from "../Trendminer/Sparkline";
import { BuyAeWidget } from "../../features/ae-eth-buy";

import { useWallet } from "../../hooks";
interface SearchSuggestion {
  type: "user" | "token" | "topic" | "post" | "dao" | "pool" | "transaction";
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  relevance: number;
  url?: string;
}

interface SearchFilter {
  users: boolean;
  tokens: boolean;
  topics: boolean;
  posts: boolean;
  daos: boolean;
  pools: boolean;
  transactions: boolean;
}

export default function RightRail({
  hideTrends = false,
  hidePriceSection = true,
}: {
  hideTrends?: boolean;
  hidePriceSection?: boolean;
}) {
  const toast = useToast();
  const navigate = useNavigate();
  const { currentBlockHeight, activeAccount } = useAeSdk();
  const [trending, setTrending] = useState<Array<[string, any]>>([] as any);
  const [prices, setPrices] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<
    SearchSuggestion[]
  >([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<
    "usd" | "eur" | "cny"
  >("usd");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter>({
    users: true,
    tokens: true,
    topics: true,
    posts: true,
    daos: true,
    pools: true,
    transactions: true,
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(
    null
  );
  const [apiStatus, setApiStatus] = useState<{
    backend: "online" | "offline" | "checking";
    trending: "online" | "offline" | "checking";
    dex: "online" | "offline" | "checking";
  }>({
    backend: "checking",
    trending: "checking",
    dex: "checking",
  });

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [topTokens, setTopTokens] = useState<any[]>([]);
  const [showLiveFeed, setShowLiveFeed] = useState(true);
  const [liveTransactions, setLiveTransactions] = useState<any[]>([]);
  const [priceAlerts, setPriceAlerts] = useState<
    Array<{ token: string; price: number; change: number }>
  >([]);

  // Toggle visibility of Top Tokens, Live Activity, and Price Alerts sections
  const SHOW_RIGHT_RAIL_EXTRAS = false;

  const [usdSpark, setUsdSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem("ae_spark_usd");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const [eurSpark, setEurSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem("ae_spark_eur");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const address = useWallet().address;
  const chainNames = useWallet().chainNames;
  const accountId = useMemo(
    () => activeAccount || address || "",
    [activeAccount, address]
  );
  const { decimalBalance, loadAccountData } = useAccountBalances(accountId);
  const balanceAe = useMemo(() => {
    try {
      return Number(decimalBalance?.toString?.() ?? 0);
    } catch {
      return 0;
    }
  }, [decimalBalance]);

  useEffect(() => {
    if (accountId) {
      loadAccountData();
    }
  }, [accountId]);

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return formatter.format(price);
  };

  const formatMarketCap = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "var(--neon-green)";
    if (change < 0) return "var(--neon-pink)";
    return "#94a3b8";
  };

  // Online status tracking
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Enhanced search functionality with debouncing
  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Add to recent searches
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== query);
      return [query, ...filtered].slice(0.1);
    });

    // Navigate to search results with enhanced query
    const searchParams = new URLSearchParams();
    searchParams.set("search", query);

    // Add filters to search params
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value) searchParams.set(`filter_${key}`, "true");
    });

    window.location.href = `/?${searchParams.toString()}`;
  };

  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);

    // Clear previous debounce
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }

    if (value.length < 2) {
      setSearchSuggestions([]);
      setShowSearchSuggestions(false);
      return;
    }

    // Debounce search to avoid too many API calls
    const timeout = setTimeout(async () => {
      await performSearch(value);
    }, 300);

    setSearchDebounce(timeout);
  };

  const performSearch = async (query: string) => {
    setIsSearching(true);

    try {
      const suggestions: SearchSuggestion[] = [];
      const searchTerm = query.toLowerCase();

      // Parallel API calls for better performance
      const searchPromises = [] as any[];

      // Search tokens if filter is enabled
      if (searchFilters.tokens) {
        searchPromises.push(
          TrendminerApi.listTokens({ search: query, limit: 5 }).catch(() => ({
            items: [],
          }))
        );
      }

      // Search topics if filter is enabled
      if (searchFilters.topics) {
        searchPromises.push(Backend.getTopics().catch(() => []));
      }

      // Search DAOs if filter is enabled
      if (searchFilters.daos) {
        searchPromises.push(
          TrendminerApi.listTokens({
            search: query,
            limit: 3,
            collection: "all",
          }).catch(() => ({ items: [] }))
        );
      }

      // Search pools if filter is enabled
      if (searchFilters.pools) {
        searchPromises.push(
          Backend.getFeed(1, "latest", null, query, true, false, false).catch(
            () => ({ items: [] })
          )
        );
      }

      const results = await Promise.all(searchPromises);
      let resultIndex = 0;

      // Process user results
      if (searchFilters.users && results[resultIndex]) {
        const userResult = results[resultIndex];
        if (userResult) {
          suggestions.push({
            type: "user",
            id: query,
            title: chainNames?.[query] || "User Profile",
            subtitle: query,
            icon: "👤",
            relevance: 1.0,
            url: `/profile/${query}`,
          });
        }
        resultIndex++;
      }

      // Process token results
      if (searchFilters.tokens && results[resultIndex]) {
        const tokens = results[resultIndex]?.items || [];
        tokens.forEach((token: any, index: number) => {
          const relevance = calculateRelevance(
            searchTerm,
            token.name || token.symbol,
            token.symbol
          );
          suggestions.push({
            type: "token",
            id: token.address,
            title: token.name || token.symbol,
            subtitle: `${token.symbol} • ${token.holders_count || 0} holders`,
            icon: "💎",
            relevance,
            url: `/trends/tokens/${token.name || token.symbol}`,
          });
        });
        resultIndex++;
      }

      // Process topic results
      if (searchFilters.topics && results[resultIndex]) {
        const topics = Array.isArray(results[resultIndex])
          ? results[resultIndex]
          : [];
        topics.forEach((topic: any) => {
          if (
            Array.isArray(topic) &&
            topic[0] &&
            typeof topic[0] === "string" &&
            topic[0].toLowerCase().includes(searchTerm)
          ) {
            const mentionCount = typeof topic[1] === "number" ? topic[1] : 0;
            const relevance = calculateRelevance(searchTerm, topic[0]);
            suggestions.push({
              type: "topic",
              id: topic[0],
              title: topic[0],
              subtitle: `${mentionCount} mentions`,
              icon: "🏷️",
              relevance,
              url: `/trends?q=${encodeURIComponent(topic[0])}`,
            });
          }
        });
        resultIndex++;
      }

      // Process DAO results
      if (searchFilters.daos && results[resultIndex]) {
        const daos = results[resultIndex]?.items || [];
        daos.forEach((dao: any) => {
          const relevance = calculateRelevance(
            searchTerm,
            dao.name || dao.symbol
          );
          suggestions.push({
            type: "dao",
            id: dao.address,
            title: dao.name || dao.symbol,
            subtitle: `DAO • ${dao.members_count || 0} members`,
            icon: "🏛️",
            relevance,
            url: `/trends/dao/${dao.address}`,
          });
        });
        resultIndex++;
      }

      // Process pool results
      if (searchFilters.pools && results[resultIndex]) {
        const pools = results[resultIndex]?.items || [];
        pools.slice(0, 3).forEach((pool: any) => {
          const relevance = calculateRelevance(
            searchTerm,
            pool.title || pool.content
          );
          suggestions.push({
            type: "pool",
            id: pool.id || pool._id,
            title: pool.title || "Pool Discussion",
            subtitle: pool.author
              ? `by ${chainNames?.[pool.author] || pool.author}`
              : "Pool",
            icon: "🏊",
            relevance,
            url: `/pool/${pool.id || pool._id}`,
          });
        });
      }

      // Sort by relevance and limit results
      const sortedSuggestions = suggestions
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 10);

      setSearchSuggestions(sortedSuggestions);
      setShowSearchSuggestions(true);
    } catch (error) {
      console.error("Failed to fetch search suggestions:", error);
      toast.push(<>Search temporarily unavailable. Please try again.</>);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateRelevance = (
    searchTerm: string,
    ...texts: string[]
  ): number => {
    let relevance = 0;
    const term = searchTerm.toLowerCase();

    texts.forEach((text) => {
      const lowerText = text.toLowerCase();

      // Exact match gets highest score
      if (lowerText === term) relevance += 10;
      // Starts with search term
      else if (lowerText.startsWith(term)) relevance += 8;
      // Contains search term
      else if (lowerText.includes(term)) relevance += 5;
      // Partial word match
      else if (term.split(" ").some((word) => lowerText.includes(word)))
        relevance += 3;
    });

    return relevance;
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.title);
    setShowSearchSuggestions(false);

    if (suggestion.url) {
      window.location.href = suggestion.url;
    } else {
      handleSearch(suggestion.title);
    }
  };

  const handleSaveSearch = () => {
    if (!searchQuery.trim()) return;

    setSavedSearches((prev) => {
      const filtered = prev.filter((s) => s !== searchQuery);
      return [searchQuery, ...filtered].slice(0, 5);
    });

    toast.push(<>Search "{searchQuery}" saved!</>);
  };

  const handleFilterToggle = (filter: keyof SearchFilter) => {
    setSearchFilters((prev) => ({
      ...prev,
      [filter]: !prev[filter],
    }));
  };

  const clearSearchHistory = () => {
    setRecentSearches([]);
    toast.push(<>Search history cleared!</>);
  };

  // Check API status
  useEffect(() => {
    const checkApiStatus = async () => {
      // Check Backend API
      try {
        await Backend.getTopics();
        setApiStatus((prev) => ({ ...prev, backend: "online" }));
      } catch {
        setApiStatus((prev) => ({ ...prev, backend: "offline" }));
      }

      // Check Trendminer API
      try {
        await TrendminerApi.listTrendingTags({ limit: 1 });
        setApiStatus((prev) => ({ ...prev, trending: "online" }));
      } catch {
        setApiStatus((prev) => ({ ...prev, trending: "offline" }));
      }

      // Check DEX API (simulate)
      try {
        await Backend.getPrice();
        setApiStatus((prev) => ({ ...prev, dex: "online" }));
      } catch {
        setApiStatus((prev) => ({ ...prev, dex: "offline" }));
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load data
  useEffect(() => {
    Backend.getTopics()
      .then((t) => {
        try {
          const list = Array.isArray(t) ? t : [];
          const filtered = list.filter(
            (row: any) =>
              Array.isArray(row) &&
              row[0] !== "#test" &&
              typeof row[0] === "string" &&
              typeof row[1] === "number"
          );
          setTrending(filtered);
        } catch (error) {
          console.error("Failed to process trending topics:", error);
          setTrending([]);
        }
      })
      .catch((error) => {
        console.error("Failed to load trending topics:", error);
        setTrending([]);
      });

    async function loadPrice() {
      try {
        const p = await Backend.getPrice();
        const a = p?.aeternity || null;
        setPrices(a);

        if (a?.usd != null) {
          setUsdSpark((prev) => {
            const next = [...prev, Number(a.usd)].slice(-50);
            sessionStorage.setItem("ae_spark_usd", JSON.stringify(next));
            return next;
          });
        }

        if (a?.eur != null) {
          setEurSpark((prev) => {
            const next = [...prev, Number(a.eur)].slice(-50);
            sessionStorage.setItem("ae_spark_eur", JSON.stringify(next));
            return next;
          });
        }
      } catch (error) {
        console.error("Failed to load price data:", error);
      }
    }

    loadPrice();
    const t = window.setInterval(loadPrice, 30000);
    return () => {
      window.clearInterval(t);
    };
  }, []);

  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saved_searches");
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Failed to load saved searches:", error);
    }
  }, []);

  // Save searches to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("saved_searches", JSON.stringify(savedSearches));
    } catch (error) {
      console.error("Failed to save searches:", error);
    }
  }, [savedSearches]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (searchDebounce) {
        clearTimeout(searchDebounce);
      }
    };
  }, [searchDebounce]);

  const topTrending = useMemo(() => trending.slice(0, 8), [trending]);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "explore":
        navigate("/pool/add-tokens");
        break;
      case "bridge":
        navigate("/defi");
        break;
      case "nfts":
        navigate("/trends");
        break;
      case "trending":
        navigate("/trends");
        break;
      case "governance":
        navigate("/voting");
        break;
      case "meet":
        navigate("/meet");
        break;
      default:
        break;
    }
  };

  const handleTokenClick = (token: any) => {
    if (token?.name) navigate(`/trends/tokens/${token.name}`);
  };

  // Simulate price alerts
  useEffect(() => {
    const alerts = [
      { token: "AE", price: 0.15, change: 2.5 },
      { token: "SUPER", price: 0.08, change: -1.2 },
      { token: "MEME", price: 0.003, change: 15.7 },
    ];
    setPriceAlerts(alerts);
  }, []);

  // Load top tokens and live activity
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [tokensResp, txResp, createdResp] = await Promise.all([
          TrendminerApi.listTokens({
            orderBy: "market_cap",
            orderDirection: "DESC",
            limit: 5,
          }).catch(() => ({ items: [] })),
          TrendminerApi.fetchJson("/api/transactions?limit=5").catch(() => ({
            items: [],
          })),
          TrendminerApi.fetchJson(
            "/api/tokens?order_by=created_at&order_direction=DESC&limit=3"
          ).catch(() => ({ items: [] })),
        ]);

        if (cancelled) return;

        const formattedTokens = (tokensResp?.items ?? []).map((token: any) => ({
          address: token.address,
          name: token.name || token.symbol || "Unknown",
          symbol: token.symbol || token.name || "TKN",
          price: token.price ? Number(token.price) : null,
          market_cap: token.market_cap ? Number(token.market_cap) : 0,
          holders_count: token.holders_count ? Number(token.holders_count) : 0,
        }));
        setTopTokens(formattedTokens);

        const createdItems = (createdResp?.items ?? []).map((t: any) => ({
          sale_address: t.sale_address || t.address || "",
          token_name: t.name || "Unknown Token",
          type: "CREATED",
          created_at: t.created_at || new Date().toISOString(),
        }));
        const txItems = txResp?.items ?? [];
        setLiveTransactions([...createdItems, ...txItems].slice(0, 8));
      } catch (e) {
        setTopTokens([]);
        setLiveTransactions([]);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="right-rail-root" className="grid gap-4 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-to-pink-500/80">
      {/* Network & Wallet Overview */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300">
        <WalletOverviewCard selectedCurrency={selectedCurrency} prices={prices} />
      </div>

      {/* Enhanced Price Section (hidden by default via hidePriceSection) */}
      {!hidePriceSection && (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              📈
            </span>
            <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">
              AE Price
            </h4>
            <div className="flex gap-1">
              {(["usd", "eur", "cny"] as const).map((currency) => (
                <button
                  key={currency}
                  className={`bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    selectedCurrency === currency
                      ? "bg-[var(--neon-teal)] text-white border-[var(--neon-teal)]"
                      : "text-[var(--light-font-color)]"
                  }`}
                  onClick={() => setSelectedCurrency(currency)}
                >
                  {currency.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-xl font-bold text-[var(--standard-font-color)] mb-1">
                  {prices?.[selectedCurrency]
                    ? formatPrice(prices[selectedCurrency], selectedCurrency)
                    : "-"}
                </div>
                <div className="text-xs font-semibold">
                  {prices?.change24h && (
                    <span
                      style={{ color: getPriceChangeColor(prices.change24h) }}
                    >
                      {prices.change24h > 0 ? "+" : ""}
                      {prices.change24h.toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Sparkline
                  points={selectedCurrency === "usd" ? usdSpark : eurSpark}
                  width={80}
                  height={24}
                  stroke={selectedCurrency === "usd" ? "#66d19e" : "#5bb0ff"}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  Market Cap
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  {prices?.marketCap ? formatMarketCap(prices.marketCap) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  24h Volume
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  {prices?.volume24h ? formatMarketCap(prices.volume24h) : "-"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Trending Section */}
      {/* <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-5 shadow-[var(--glass-shadow)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_12px_32px_rgba(255,107,107,0.2)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">🔥</span>
          <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">Trending Topics</h4>
          <button
            className="bg-none border-none text-[var(--neon-teal)] text-base cursor-pointer p-1 rounded transition-all duration-200 hover:bg-[rgba(0,255,157,0.1)] hover:scale-110"
            onClick={() => window.location.href = '/trends'}
            title="Explore all trends"
          >
            🔍
          </button>
        </div>

        <div className="grid gap-2">
          {topTrending.map((topic, index) => (
            <div key={index} className="flex items-center gap-2 p-2 px-3 bg-white/[0.02] border border-white/5 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/5 hover:border-white/10 hover:translate-x-1">
              <span className="text-[10px] text-[var(--neon-pink)] font-bold min-w-[20px]">#{index + 1}</span>
              <span className="flex-1 text-xs text-[var(--standard-font-color)] font-semibold">
                {typeof topic[0] === 'string' ? topic[0] : 'Unknown Topic'}
              </span>
              <span className="text-[10px] text-[var(--light-font-color)]">
                {typeof topic[1] === 'number' ? `${topic[1]} mentions` : '0 mentions'}
              </span>
            </div>
          ))}
        </div>
      </div> */}

      {/* Explore Trends Sidebar (replaced with Trending sidebar) */}

      {/* Top Tokens */}
      {SHOW_RIGHT_RAIL_EXTRAS && topTokens.length > 0 && (
        <div className="genz-card" style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "18px" }}>💎</span>
            <h4
              style={{
                margin: 0,
                color: "var(--neon-purple)",
                fontSize: "16px",
              }}
            >
              Top Tokens
            </h4>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {topTokens.slice(0, 4).map((token, index) => (
              <div
                key={token.address || index}
                className="token-card"
                style={{
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
                onClick={() => handleTokenClick(token)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.08)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.background =
                    "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLDivElement).style.transform =
                    "translateY(0)";
                }}
                title={`View ${token.name} details`}
              >
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: `hsl(${index * 60}, 70%, 60%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 700,
                    color: "white",
                  }}
                >
                  {token.symbol?.charAt(0) || token.name?.charAt(0) || "T"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "white",
                      marginBottom: "2px",
                    }}
                  >
                    {token.name}
                  </div>
                  <div style={{ fontSize: "9px", color: "#94a3b8" }}>
                    {token.price && !isNaN(Number(token.price))
                      ? `${Number(token.price).toFixed(6)} AE`
                      : "N/A"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--neon-teal)",
                    fontWeight: 600,
                  }}
                >
                  #{index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      {SHOW_RIGHT_RAIL_EXTRAS && (
      <div className="genz-card" style={{ marginBottom: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            cursor: "pointer",
          }}
          onClick={() => setShowLiveFeed(!showLiveFeed)}
          title="Click to toggle live feed"
        >
          <span style={{ fontSize: "18px" }}>📡</span>
          <h4
            style={{ margin: 0, color: "var(--neon-green)", fontSize: "16px" }}
          >
            Live Activity
          </h4>
          <span
            style={{
              fontSize: "12px",
              color: "var(--neon-green)",
              marginLeft: "auto",
              transition: "transform 0.3s ease",
              transform: showLiveFeed ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▼
          </span>
        </div>
        <div
          style={{
            maxHeight: showLiveFeed ? "300px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.3s ease",
          }}
        >
          <div style={{ display: "grid", gap: "6px" }}>
            {liveTransactions.map((tx, index) => (
              <div
                key={index}
                className={`live-activity-item ${
                  tx.type === "CREATED" ? "new-token" : ""
                }`}
                style={{
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.02)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.03)",
                  fontSize: "10px",
                  color: "#b8c5d6",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  animation: index === 0 ? "slideIn 0.5s ease" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color:
                      tx.type === "CREATED"
                        ? "var(--neon-green)"
                        : "var(--neon-blue)",
                  }}
                >
                  {tx.type === "CREATED" ? "🆕" : "💱"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    {tx.token_name}
                  </div>
                  <div style={{ fontSize: "9px", color: "#94a3b8" }}>
                    {tx.type === "CREATED" ? "Token Created" : "Transaction"}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "8px",
                    color: "#64748b",
                    fontFamily: "monospace",
                  }}
                >
                  {new Date(tx.created_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Price Alerts */}
      {SHOW_RIGHT_RAIL_EXTRAS && priceAlerts.length > 0 && (
        <div className="genz-card" style={{ marginBottom: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px",
            }}
          >
            <span style={{ fontSize: "18px" }}>📈</span>
            <h4
              style={{ margin: 0, color: "var(--neon-blue)", fontSize: "16px" }}
            >
              Price Alerts
            </h4>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            {priceAlerts.map((alert, index) => (
              <div
                key={index}
                className={`price-alert ${
                  alert.change > 0 ? "positive" : "negative"
                }`}
                style={{
                  padding: "10px 12px",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background:
                      alert.change > 0
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(255, 107, 107, 0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}
                >
                  {alert.change > 0 ? "📈" : "📉"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    {alert.token}
                  </div>
                  <div style={{ fontSize: "9px", color: "#94a3b8" }}>
                    {Number(alert.price).toFixed(6)} AE
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color:
                      alert.change > 0
                        ? "var(--neon-green)"
                        : "var(--neon-pink)",
                    fontWeight: 600,
                  }}
                >
                  {alert.change > 0 ? "+" : ""}
                  {alert.change.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - moved to Right Rail bottom */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h4 className="m-0 text-white text-base font-bold">
            Quick Actions
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(236,72,153,0.35)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/trends/tokens')}
            title="Explore trends"
          >
            🔍 Explore Trends
          </button>
          <button
            className="bg-gradient-to-r from-rose-500 to-orange-500 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(244,63,94,0.35)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/trends/create')}
            title="Tokenize a trend"
          >
            🚀 Tokenize a Trend
          </button>
          <button
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.3)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/swap')}
            title="Swap tokens on the DEX"
          >
            🔄 Swap Tokens
          </button>
          <button
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.3)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/wrap')}
            title="Wrap or unwrap AE"
          >
            📦 Wrap AE
          </button>
          <button
            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(59,130,246,0.3)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/buy-ae-with-eth')}
            title="Buy AE with ETH"
          >
            🌉 Buy AE with ETH
          </button>
          <button
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(245,158,11,0.3)] relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/pool')}
            title="Provide liquidity to pools"
          >
            💧 Provide Liquidity
          </button>
          <a
            href="https://quali.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(147,51,234,0.35)] no-underline text-center flex items-center justify-center gap-1.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            title="Open Chat"
          >
            💬 Chat
          </a>
        </div>
      </div>

      {/* Buy AE with ETH widget (compact) */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-4 shadow-none">
        <BuyAeWidget embedded={true} />
      </div>


    </div>
  );
}
