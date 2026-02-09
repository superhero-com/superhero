import { useState, useEffect, useMemo } from 'react';
import { getAllTokens } from '../../../libs/dexBackend';
import { Token, TokenListState } from '../types/explore';

/**
 * @deprecated Use useQuery from @tanstack/react-query instead
 */
export function useTokenList(): TokenListState {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'name' | 'pairs' | 'priceUsd' | 'tvlUsd' | 'priceChangeDay' | 'volumeUsdDay' | 'volumeUsdAll'; asc: boolean }>({
    key: 'pairs',
    asc: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tokens on mount
  useEffect(() => {
    loadTokens();
  }, []);

  async function loadTokens() {
    setLoading(true);
    setError(null);

    try {
      const tokenData = await getAllTokens();
      setTokens(tokenData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tokens');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort tokens
  const filteredAndSortedTokens = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = tokens.filter((t) => !term
      || (t.symbol || '').toLowerCase().includes(term)
      || (t.name || '').toLowerCase().includes(term)
      || (t.address || '').toLowerCase().includes(term));

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sort.key];
      let bValue: any = b[sort.key];

      // Handle numeric fields
      if (['pairs', 'priceUsd', 'tvlUsd', 'priceChangeDay', 'volumeUsdDay', 'volumeUsdAll'].includes(sort.key)) {
        aValue = sort.key === 'pairs' ? (a.pairs || 0) : parseFloat(a[sort.key] || '0');
        bValue = sort.key === 'pairs' ? (b.pairs || 0) : parseFloat(b[sort.key] || '0');
        return aValue - bValue;
      }

      // Handle string fields (name)
      return String(aValue || '').localeCompare(String(bValue || ''));
    });

    return sort.asc ? sorted : sorted.reverse();
  }, [tokens, search, sort]);

  const toggleSort = (key: 'name' | 'pairs' | 'priceUsd' | 'tvlUsd' | 'priceChangeDay' | 'volumeUsdDay' | 'volumeUsdAll') => {
    setSort((prev) => ({
      key,
      asc: prev.key === key ? !prev.asc : false, // Default to descending for numeric values
    }));
  };

  return {
    tokens: filteredAndSortedTokens,
    search,
    sort,
    loading,
    error,
    setSearch,
    setSort,
    toggleSort,
    refresh: loadTokens,
  };
}
