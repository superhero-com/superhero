import { useEffect, useMemo, useRef, useState } from 'react';
import { Backend, TrendminerApi } from '../../api/backend';
import { useToast } from '../ToastProvider';
import Sparkline from '../Trendminer/Sparkline';
import TrendingSidebar from '../Trendminer/TrendingSidebar';

import { useWallet } from '../../hooks';
interface SearchSuggestion {
  type: 'user' | 'token' | 'topic' | 'post' | 'dao' | 'pool' | 'transaction';
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

export default function RightRail() {
  const toast = useToast();
  const [trending, setTrending] = useState<Array<[string, any]>>([] as any);
  const [prices, setPrices] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<'usd' | 'eur' | 'cny'>('usd');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState<SearchFilter>({
    users: true,
    tokens: true,
    topics: true,
    posts: true,
    daos: true,
    pools: true,
    transactions: true
  });
  const [isSearching, setIsSearching] = useState(false);
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const [apiStatus, setApiStatus] = useState<{
    backend: 'online' | 'offline' | 'checking';
    trendminer: 'online' | 'offline' | 'checking';
    dex: 'online' | 'offline' | 'checking';
  }>({
    backend: 'checking',
    trendminer: 'checking',
    dex: 'checking'
  });

  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [usdSpark, setUsdSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem('ae_spark_usd');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const [eurSpark, setEurSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem('ae_spark_eur');
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const address = useWallet().address;
  const chainNames = useWallet().chainNames;

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
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
    if (change > 0) return 'var(--neon-green)';
    if (change < 0) return 'var(--neon-pink)';
    return '#94a3b8';
  };

  // Enhanced search functionality with debouncing
  const handleSearch = (query: string) => {
    if (!query.trim()) return;

    // Add to recent searches
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== query);
      return [query, ...filtered].slice(0.10);
    });

    // Navigate to search results with enhanced query
    const searchParams = new URLSearchParams();
    searchParams.set('search', query);

    // Add filters to search params
    Object.entries(searchFilters).forEach(([key, value]) => {
      if (value) searchParams.set(`filter_${key}`, 'true');
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
          TrendminerApi.listTokens({ search: query, limit: 5 }).catch(() => ({ items: [] }))
        );
      }

      // Search topics if filter is enabled
      if (searchFilters.topics) {
        searchPromises.push(
          Backend.getTopics().catch(() => [])
        );
      }

      // Search DAOs if filter is enabled
      if (searchFilters.daos) {
        searchPromises.push(
          TrendminerApi.listTokens({ search: query, limit: 3, collection: 'all' }).catch(() => ({ items: [] }))
        );
      }

      // Search pools if filter is enabled
      if (searchFilters.pools) {
        searchPromises.push(
          Backend.getFeed(1, 'latest', null, query, true, false, false).catch(() => ({ items: [] }))
        );
      }

      const results = await Promise.all(searchPromises);
      let resultIndex = 0;

      // Process user results
      if (searchFilters.users && results[resultIndex]) {
        const userResult = results[resultIndex];
        if (userResult) {
          suggestions.push({
            type: 'user',
            id: query,
            title: chainNames?.[query] || 'User Profile',
            subtitle: query,
            icon: '👤',
            relevance: 1.0,
            url: `/profile/${query}`
          });
        }
        resultIndex++;
      }

      // Process token results
      if (searchFilters.tokens && results[resultIndex]) {
        const tokens = results[resultIndex]?.items || [];
        tokens.forEach((token: any, index: number) => {
          const relevance = calculateRelevance(searchTerm, token.name || token.symbol, token.symbol);
          suggestions.push({
            type: 'token',
            id: token.address,
            title: token.name || token.symbol,
            subtitle: `${token.symbol} • ${token.holders_count || 0} holders`,
            icon: '💎',
            relevance,
            url: `/trendminer/tokens/${token.name || token.symbol}`
          });
        });
        resultIndex++;
      }

      // Process topic results
      if (searchFilters.topics && results[resultIndex]) {
        const topics = Array.isArray(results[resultIndex]) ? results[resultIndex] : [];
        topics.forEach((topic: any) => {
          if (Array.isArray(topic) && topic[0] && typeof topic[0] === 'string' &&
            topic[0].toLowerCase().includes(searchTerm)) {
            const mentionCount = typeof topic[1] === 'number' ? topic[1] : 0;
            const relevance = calculateRelevance(searchTerm, topic[0]);
            suggestions.push({
              type: 'topic',
              id: topic[0],
              title: topic[0],
              subtitle: `${mentionCount} mentions`,
              icon: '🏷️',
              relevance,
              url: `/trending?q=${encodeURIComponent(topic[0])}`
            });
          }
        });
        resultIndex++;
      }

      // Process DAO results
      if (searchFilters.daos && results[resultIndex]) {
        const daos = results[resultIndex]?.items || [];
        daos.forEach((dao: any) => {
          const relevance = calculateRelevance(searchTerm, dao.name || dao.symbol);
          suggestions.push({
            type: 'dao',
            id: dao.address,
            title: dao.name || dao.symbol,
            subtitle: `DAO • ${dao.members_count || 0} members`,
            icon: '🏛️',
            relevance,
            url: `/trendminer/dao/${dao.address}`
          });
        });
        resultIndex++;
      }

      // Process pool results
      if (searchFilters.pools && results[resultIndex]) {
        const pools = results[resultIndex]?.items || [];
        pools.slice(0, 3).forEach((pool: any) => {
          const relevance = calculateRelevance(searchTerm, pool.title || pool.content);
          suggestions.push({
            type: 'pool',
            id: pool.id || pool._id,
            title: pool.title || 'Pool Discussion',
            subtitle: pool.author ? `by ${chainNames?.[pool.author] || pool.author}` : 'Pool',
            icon: '🏊',
            relevance,
            url: `/pool/${pool.id || pool._id}`
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
      console.error('Failed to fetch search suggestions:', error);
      toast.push(<>Search temporarily unavailable. Please try again.</>);
    } finally {
      setIsSearching(false);
    }
  };

  const calculateRelevance = (searchTerm: string, ...texts: string[]): number => {
    let relevance = 0;
    const term = searchTerm.toLowerCase();

    texts.forEach(text => {
      const lowerText = text.toLowerCase();

      // Exact match gets highest score
      if (lowerText === term) relevance += 10;
      // Starts with search term
      else if (lowerText.startsWith(term)) relevance += 8;
      // Contains search term
      else if (lowerText.includes(term)) relevance += 5;
      // Partial word match
      else if (term.split(' ').some(word => lowerText.includes(word))) relevance += 3;
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

    setSavedSearches(prev => {
      const filtered = prev.filter(s => s !== searchQuery);
      return [searchQuery, ...filtered].slice(0, 5);
    });

    toast.push(<>Search "{searchQuery}" saved!</>);
  };

  const handleFilterToggle = (filter: keyof SearchFilter) => {
    setSearchFilters(prev => ({
      ...prev,
      [filter]: !prev[filter]
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
        setApiStatus(prev => ({ ...prev, backend: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, backend: 'offline' }));
      }

      // Check Trendminer API
      try {
        await TrendminerApi.listTrendingTags({ limit: 1 });
        setApiStatus(prev => ({ ...prev, trendminer: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, trendminer: 'offline' }));
      }

      // Check DEX API (simulate)
      try {
        await Backend.getPrice();
        setApiStatus(prev => ({ ...prev, dex: 'online' }));
      } catch {
        setApiStatus(prev => ({ ...prev, dex: 'offline' }));
      }
    };

    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Load data
  useEffect(() => {
    Backend.getTopics().then((t) => {
      try {
        const list = Array.isArray(t) ? t : [];
        const filtered = list.filter((row: any) =>
          Array.isArray(row) &&
          row[0] !== '#test' &&
          typeof row[0] === 'string' &&
          typeof row[1] === 'number'
        );
        setTrending(filtered);
      } catch (error) {
        console.error('Failed to process trending topics:', error);
        setTrending([]);
      }
    }).catch((error) => {
      console.error('Failed to load trending topics:', error);
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
            sessionStorage.setItem('ae_spark_usd', JSON.stringify(next));
            return next;
          });
        }

        if (a?.eur != null) {
          setEurSpark((prev) => {
            const next = [...prev, Number(a.eur)].slice(-50);
            sessionStorage.setItem('ae_spark_eur', JSON.stringify(next));
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to load price data:', error);
      }
    }

    loadPrice();
    const t = window.setInterval(loadPrice, 30000);
    return () => { window.clearInterval(t); };
  }, []);


  // Load saved searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('saved_searches');
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  }, []);

  // Save searches to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('saved_searches', JSON.stringify(savedSearches));
    } catch (error) {
      console.error('Failed to save searches:', error);
    }
  }, [savedSearches]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSearchSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <div className="grid gap-4 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-teal-500/60 scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-teal-500/80 hover:scrollbar-thumb-to-pink-500/80">
      {/* Enhanced Price Section */}
      <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-5 shadow-[var(--glass-shadow)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_12px_32px_rgba(255,107,107,0.2)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">📈</span>
          <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">AE Price</h4>
          <div className="flex gap-1">
            {(['usd', 'eur', 'cny'] as const).map(currency => (
              <button
                key={currency}
                className={`bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                  selectedCurrency === currency ? 'bg-[var(--neon-teal)] text-white border-[var(--neon-teal)]' : 'text-[var(--light-font-color)]'
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
                {prices?.[selectedCurrency] ? formatPrice(prices[selectedCurrency], selectedCurrency) : '-'}
              </div>
              <div className="text-xs font-semibold">
                {prices?.change24h && (
                  <span style={{ color: getPriceChangeColor(prices.change24h) }}>
                    {prices.change24h > 0 ? '+' : ''}{prices.change24h.toFixed(2)}% (24h)
                  </span>
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <Sparkline
                points={selectedCurrency === 'usd' ? usdSpark : eurSpark}
                width={80}
                height={24}
                stroke={selectedCurrency === 'usd' ? "#66d19e" : "#5bb0ff"}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
              <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">Market Cap</span>
              <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                {prices?.marketCap ? formatMarketCap(prices.marketCap) : '-'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
              <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">24h Volume</span>
              <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                {prices?.volume24h ? formatMarketCap(prices.volume24h) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Trending Section */}
      {/* <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-5 shadow-[var(--glass-shadow)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_12px_32px_rgba(255,107,107,0.2)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">🔥</span>
          <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">Trending Topics</h4>
          <button
            className="bg-none border-none text-[var(--neon-teal)] text-base cursor-pointer p-1 rounded transition-all duration-200 hover:bg-[rgba(0,255,157,0.1)] hover:scale-110"
            onClick={() => window.location.href = '/trending'}
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
      <TrendingSidebar />
    </div>
  );
}


