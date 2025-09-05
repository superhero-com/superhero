import { useState, useEffect, useMemo } from 'react';
import { getPairs } from '../../../libs/dexBackend';
import { Pair, PairListState } from '../types/explore';

/**
 * @deprecated Use useQuery from @tanstack/react-query instead
 */
export function usePairList(): PairListState {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ key: 'transactions' | 'address' | 'pair'; asc: boolean }>({
    key: 'transactions',
    asc: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load pairs on mount
  useEffect(() => {
    loadPairs();
  }, []);

  async function loadPairs() {
    setLoading(true);
    setError(null);

    try {
      const pairData = await getPairs(false);
      const pairsArray = pairData ? Object.values(pairData) : [];
      setPairs(pairsArray);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pairs');
    } finally {
      setLoading(false);
    }
  }

  // Filter and sort pairs
  const filteredAndSortedPairs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = pairs.filter((p) => {
      const pairName = `${p.token0Symbol}/${p.token1Symbol}`.toLowerCase();
      return !term ||
        pairName.includes(term) ||
        (p.address || '').toLowerCase().includes(term) ||
        (p.token0 || p.token0Address || '').toLowerCase().includes(term) ||
        (p.token1 || p.token1Address || '').toLowerCase().includes(term);
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sort.key === 'pair') {
        const ap = `${a.token0Symbol}/${a.token1Symbol}`;
        const bp = `${b.token0Symbol}/${b.token1Symbol}`;
        return ap.localeCompare(bp);
      }

      const aValue = a[sort.key];
      const bValue = b[sort.key];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return aValue - bValue;
      }

      return String(aValue || '').localeCompare(String(bValue || ''));
    });

    return sort.asc ? sorted : sorted.reverse();
  }, [pairs, search, sort]);

  const toggleSort = (key: 'transactions' | 'address' | 'pair') => {
    setSort(prev => ({
      key,
      asc: prev.key === key ? !prev.asc : true
    }));
  };

  return {
    pairs: filteredAndSortedPairs,
    search,
    sort,
    loading,
    error,
    setSearch,
    setSort,
    toggleSort,
    refresh: loadPairs,
  };
}
