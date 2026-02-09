import { useState, useEffect, useCallback } from 'react';
import { useAeSdk } from './useAeSdk';
import type { TransactionStatus } from '../components/dex/types/dex';

interface UseTransactionStatusOptions {
  enabled?: boolean;
  refetchInterval?: number; // milliseconds
}

export const useTransactionStatus = (
  txHash?: string,
  options: UseTransactionStatusOptions = {},
) => {
  const { sdk } = useAeSdk();
  const { enabled = true, refetchInterval = 5000 } = options;

  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactionStatus = useCallback(async (hash: string)
    : Promise<TransactionStatus | null> => {
    if (!sdk || !hash) return null;

    try {
      // Get transaction info from the node
      // @ts-expect-error - sdk.getTxInfo is not typed
      const txInfo = await sdk.getTxInfo(hash);

      if (!txInfo) {
        return {
          confirmed: false,
          pending: true,
          failed: false,
        };
      }

      // Get current height to calculate confirmations
      const currentHeight = await sdk.getHeight();
      const confirmations = txInfo.blockHeight ? currentHeight - txInfo.blockHeight + 1 : 0;

      return {
        confirmed: !!txInfo.blockHeight,
        blockNumber: txInfo.blockHeight,
        confirmations,
        pending: !txInfo.blockHeight,
        failed: false, // TODO: Add logic to detect failed transactions
      };
    } catch (err: any) {
      // If transaction is not found, it might be pending or failed
      if (err.message?.includes('Transaction not found') || err.message?.includes('not found')) {
        return {
          confirmed: false,
          pending: true,
          failed: false,
        };
      }

      // Other errors might indicate failed transaction
      return {
        confirmed: false,
        pending: false,
        failed: true,
      };
    }
  }, [sdk]);

  const refetch = useCallback(async () => {
    if (!txHash || !enabled) return;

    setLoading(true);
    setError(null);

    try {
      const newStatus = await fetchTransactionStatus(txHash);
      setStatus(newStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch transaction status');
    } finally {
      setLoading(false);
    }
  }, [txHash, enabled, fetchTransactionStatus]);

  // Initial fetch
  useEffect(() => {
    if (txHash && enabled) {
      refetch();
    }
  }, [txHash, enabled, refetch]);

  // Auto-refetch for pending transactions
  useEffect(() => {
    if (!txHash || !enabled || !status?.pending) return;

    const interval = setInterval(() => {
      refetch();
    }, refetchInterval);

    // eslint-disable-next-line consistent-return
    return () => clearInterval(interval);
  }, [txHash, enabled, status?.pending, refetchInterval, refetch]);

  return {
    status,
    loading,
    error,
    refetch,
  };
};
