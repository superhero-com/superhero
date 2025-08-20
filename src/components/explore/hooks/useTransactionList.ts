import { useState, useEffect } from 'react';
import { getHistory } from '../../../libs/dexBackend';
import { Transaction, TransactionListState } from '../types/explore';

export function useTransactionList(): TransactionListState {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<'all' | 'swap' | 'add' | 'remove'>('all');
  const [window, setWindow] = useState<'24h' | '7d'>('24h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transactions when type or window changes
  useEffect(() => {
    loadTransactions();
  }, [type, window]);

  async function loadTransactions() {
    setLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const since = window === '24h' ? (now - 24 * 3600_000) : (now - 7 * 24 * 3600_000);
      
      const params: any = { limit: 100, since };
      if (type !== 'all') {
        params.type = type;
      }

      const historyData = await getHistory(params);
      setTransactions(historyData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }

  return {
    transactions,
    type,
    window,
    loading,
    error,
    setType,
    setWindow,
    refresh: loadTransactions,
  };
}
