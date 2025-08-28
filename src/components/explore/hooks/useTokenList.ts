import { useState, useEffect, useMemo } from 'react';
import { getAllTokens } from '../../../libs/dexBackend';
import { Token, TokenListState } from '../types/explore';

export function useTokenList(): TokenListState {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'symbol' | 'name' | 'pairs' | 'decimals'; asc: boolean }>({
    key: 'pairs',
    asc: false
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
    const filtered = tokens.filter((t) => 
      !term ||
      (t.symbol || '').toLowerCase().includes(term) ||
      (t.name || '').toLowerCase().includes(term) ||
      (t.address || '').toLowerCase().includes(term)
    );

    const sorted = [...filtered].sort((a, b) => {
      let aValue: any = a[sort.key];
      let bValue: any = b[sort.key];

      // Handle special case for pairs count
      if (sort.key === 'pairs') {
        aValue = a.pairs || 0;
        bValue = b.pairs || 0;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      return String(aValue || '').localeCompare(String(bValue || ''));
    });

    return sort.asc ? sorted : sorted.reverse();
  }, [tokens, search, sort]);

  const toggleSort = (key: 'symbol' | 'name' | 'pairs' | 'decimals') => {
    setSort(prev => ({
      key,
      asc: prev.key === key ? !prev.asc : true
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
