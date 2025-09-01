import { useEffect, useMemo, useRef, useState } from 'react';
import { Backend, TrendminerApi } from '../../api/backend';
import { useToast } from '../ToastProvider';
import Sparkline from '../Trendminer/Sparkline';
import TrendingSidebar from '../Trendminer/TrendingSidebar';
import './RightRail.scss';

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

      // Search users if filter is enabled
      if (searchFilters.users) {
        searchPromises.push(
          Backend.getProfile(query).catch(() => null)
        );
      }

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
    <div className="right-rail">
      {/* Enhanced Search Section */}
      <div className="genz-card search-section">
        <div className="card-header">
          <span className="card-icon">🔍</span>
          <h4>Smart Search</h4>
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            title="Advanced search options"
          >
            ⚙️
          </button>
        </div>

        <div className="search-container" ref={suggestionsRef}>
          <div className="search-input-wrapper">
            <input
              className="enhanced-search-input"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(searchQuery);
                }
              }}
              placeholder="Search users, tokens, topics, DAOs..."
            />
            {isSearching && (
              <div className="search-spinner">
                <div className="spinner"></div>
              </div>
            )}
          </div>

          {showSearchSuggestions && searchSuggestions.length > 0 && (
            <div className="search-suggestions">
              <div className="suggestions-header">
                <span>Search Results</span>
                <span className="results-count">{searchSuggestions.length} found</span>
              </div>
              {searchSuggestions.map((suggestion, index) => (
                <div
                  key={index}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <span className="suggestion-icon">{suggestion.icon}</span>
                  <div className="suggestion-content">
                    <div className="suggestion-title">{suggestion.title}</div>
                    {suggestion.subtitle && (
                      <div className="suggestion-subtitle">{suggestion.subtitle}</div>
                    )}
                  </div>
                  <span className="suggestion-type">{suggestion.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAdvancedSearch && (
          <div className="advanced-search">
            {/* Search Filters */}
            <div className="search-filters">
              <h5>Search Filters</h5>
              <div className="filter-grid">
                {Object.entries(searchFilters).map(([key, value]) => (
                  <label key={key} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => handleFilterToggle(key as keyof SearchFilter)}
                    />
                    <span className="filter-label">
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="search-history">
              <div className="history-header">
                <h5>Recent Searches</h5>
                {recentSearches.length > 0 && (
                  <button
                    className="clear-history-btn"
                    onClick={clearSearchHistory}
                    title="Clear search history"
                  >
                    🗑️
                  </button>
                )}
              </div>
              <div className="search-tags">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    className="search-tag"
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </button>
                ))}
                {recentSearches.length === 0 && (
                  <span className="empty-state">No recent searches</span>
                )}
              </div>
            </div>

            <div className="saved-searches">
              <h5>Saved Searches</h5>
              <div className="search-tags">
                {savedSearches.map((search, index) => (
                  <button
                    key={index}
                    className="search-tag saved"
                    onClick={() => handleSearch(search)}
                  >
                    {search}
                  </button>
                ))}
                {savedSearches.length === 0 && (
                  <span className="empty-state">No saved searches</span>
                )}
              </div>
            </div>

            {searchQuery && (
              <button
                className="save-search-btn"
                onClick={handleSaveSearch}
              >
                💾 Save Search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Price Section */}
      <div className="genz-card price-section">
        <div className="card-header">
          <span className="card-icon">📈</span>
          <h4>AE Price</h4>
          <div className="currency-selector">
            {(['usd', 'eur', 'cny'] as const).map(currency => (
              <button
                key={currency}
                className={`currency-btn ${selectedCurrency === currency ? 'active' : ''}`}
                onClick={() => setSelectedCurrency(currency)}
              >
                {currency.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="price-content">
          <div className="price-row">
            <div className="price-info">
              <div className="price-amount">
                {prices?.[selectedCurrency] ? formatPrice(prices[selectedCurrency], selectedCurrency) : '-'}
              </div>
              <div className="price-change">
                {prices?.change24h && (
                  <span style={{ color: getPriceChangeColor(prices.change24h) }}>
                    {prices.change24h > 0 ? '+' : ''}{prices.change24h.toFixed(2)}% (24h)
                  </span>
                )}
              </div>
            </div>
            <div className="price-chart">
              <Sparkline
                points={selectedCurrency === 'usd' ? usdSpark : eurSpark}
                width={80}
                height={24}
                stroke={selectedCurrency === 'usd' ? "#66d19e" : "#5bb0ff"}
              />
            </div>
          </div>

          <div className="price-stats">
            <div className="stat-item">
              <span className="stat-label">Market Cap</span>
              <span className="stat-value">
                {prices?.marketCap ? formatMarketCap(prices.marketCap) : '-'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">24h Volume</span>
              <span className="stat-value">
                {prices?.volume24h ? formatMarketCap(prices.volume24h) : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Trending Section */}
      <div className="genz-card trending-section">
        <div className="card-header">
          <span className="card-icon">🔥</span>
          <h4>Trending Topics</h4>
          <button
            className="explore-btn"
            onClick={() => window.location.href = '/trending'}
            title="Explore all trends"
          >
            🔍
          </button>
        </div>

        <div className="trending-content">
          {topTrending.map((topic, index) => (
            <div key={index} className="trending-item">
              <span className="trending-rank">#{index + 1}</span>
              <span className="trending-topic">
                {typeof topic[0] === 'string' ? topic[0] : 'Unknown Topic'}
              </span>
              <span className="trending-count">
                {typeof topic[1] === 'number' ? `${topic[1]} mentions` : '0 mentions'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Explore Trends Sidebar (replaced with Trending sidebar) */}
      <TrendingSidebar />
    </div>
  );
}


