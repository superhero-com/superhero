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

  const fetchTransactionStatus = useCallback(async (hash: string): Promise<TransactionStatus | null> => {
    if (!sdk || !hash) return null;

    try {
      // Get transaction info from the node
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

    return () => clearInterval(interval);
  }, [txHash, enabled, status?.pending, refetchInterval, refetch]);

  return {
    status,
    loading,
    error,
    refetch,
  };
};

export const useMultipleTransactionStatus = (
  txHashes: string[],
  options: UseTransactionStatusOptions = {},
) => {
  const { sdk } = useAeSdk();
  const { enabled = true } = options;

  const [statuses, setStatuses] = useState<Record<string, TransactionStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // const fetchMultipleStatuses = useCallback(async (hashes: string[]) => {
  //   if (!sdk || !hashes.length) return {};

  //   setLoading(true);
  //   setError(null);

  //   try {
  //     const results: Record<string, TransactionStatus> = {};

  //     // Fetch all transaction statuses in parallel
  //     const promises = hashes.map(async (hash) => {
  //       try {
  //         const txInfo = await sdk.getTxInfo(hash);
  //         const currentHeight = await sdk.getHeight();
  //         const confirmations = txInfo?.blockHeight ? currentHeight - txInfo.blockHeight + 1 : 0;

  //         return {
  //           hash,
  //           status: {
  //             confirmed: !!txInfo?.blockHeight,
  //             blockNumber: txInfo?.blockHeight,
  //             confirmations,
  //             pending: !txInfo?.blockHeight,
  //             failed: false,
  //           } as TransactionStatus
  //         };
  //       } catch (err: any) {
  //         return {
  //           hash,
  //           status: {
  //             confirmed: false,
  //             pending: err.message?.includes('not found'),
  //             failed: !err.message?.includes('not found'),
  //           } as TransactionStatus
  //         };
  //       }
  //     });

  //     const responses = await Promise.all(promises);

  //     responses.forEach(({ hash, status }) => {
  //       results[hash] = status;
  //     });

  //     setStatuses(results);
  //     return results;
  //   } catch (err: any) {
  //     setError(err.message || 'Failed to fetch transaction statuses');
  //     return {};
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [sdk]);

  const refetch = useCallback(() => {
    if (enabled && txHashes.length > 0) {
      // return fetchMultipleStatuses(txHashes);
    }
  }, [txHashes, enabled]);

  // Initial fetch
  // useEffect(() => {
  //   if (enabled && txHashes.length > 0) {
  //     fetchMultipleStatuses(txHashes);
  //   }
  // }, [txHashes, enabled, fetchMultipleStatuses]);

  return {
    statuses,
    loading,
    error,
    refetch,
  };
};
