import { useState, useEffect, useCallback } from 'react';
import { CONFIG } from '../config';
import { useAeSdk } from './useAeSdk';
import type { TransactionStatus } from '../components/dex/types/dex';

interface UseTransactionStatusOptions {
  enabled?: boolean;
  refetchInterval?: number; // milliseconds
}

const normalizeBlockHeight = (tx: any): number | undefined => (
  tx?.blockHeight
  ?? tx?.block_height
  ?? undefined
);

const normalizeTxFailure = (tx: any, txInfo?: any): boolean => {
  const nodeReturnType = txInfo?.callInfo?.returnType;
  if (nodeReturnType) return nodeReturnType !== 'ok';

  const result = tx?.tx?.result ?? tx?.result;
  if (typeof result === 'string' && result.toLowerCase() !== 'ok') return true;

  const returnType = tx?.tx?.return_type ?? tx?.tx?.returnType ?? tx?.return_type ?? tx?.returnType;
  if (typeof returnType === 'string' && returnType.toLowerCase() !== 'ok') return true;

  return false;
};

export const useTransactionStatus = (
  txHash?: string,
  options: UseTransactionStatusOptions = {},
) => {
  const { sdk } = useAeSdk();
  const { enabled = true, refetchInterval = 5000 } = options;

  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFromMiddleware = useCallback(async (
    hash: string,
    currentHeight?: number,
  ): Promise<TransactionStatus | null> => {
    const baseUrl = CONFIG.MIDDLEWARE_URL?.replace(/\/$/, '');
    if (!baseUrl) return null;

    const response = await fetch(`${baseUrl}/v3/transactions/${hash}`);
    if (!response.ok) {
      if (response.status === 404) {
        return {
          confirmed: false,
          pending: true,
          failed: false,
        };
      }
      throw new Error(`Middleware status fetch failed: ${response.status}`);
    }

    const tx = await response.json();
    const blockHeight = normalizeBlockHeight(tx);
    const failed = normalizeTxFailure(tx);
    const confirmations = blockHeight && currentHeight
      ? currentHeight - blockHeight + 1
      : undefined;

    return {
      confirmed: Boolean(blockHeight) && !failed,
      blockNumber: blockHeight,
      confirmations,
      pending: !blockHeight,
      failed,
    };
  }, []);

  const fetchTransactionStatus = useCallback(async (hash: string)
    : Promise<TransactionStatus | null> => {
    if (!sdk || !hash) return null;
    if (!hash.startsWith('th_')) {
      // Non-aeternity tx hashes (for example Ethereum) are not queryable via AE node.
      return {
        confirmed: false,
        pending: true,
        failed: false,
      };
    }

    try {
      const tx = await sdk.getTransactionByHash(hash);

      if (!tx) {
        const fallback = await fetchFromMiddleware(hash);
        return fallback ?? {
          confirmed: false,
          pending: true,
          failed: false,
        };
      }

      // Get current height to calculate confirmations
      const currentHeight = await sdk.getHeight();
      const blockHeight = normalizeBlockHeight(tx);
      const confirmations = blockHeight ? currentHeight - blockHeight + 1 : 0;

      let failed = false;
      let txInfo: any;
      try {
        txInfo = await sdk.getTransactionInfoByHash(hash);
        failed = normalizeTxFailure(tx, txInfo);
      } catch {
        failed = normalizeTxFailure(tx);
      }

      return {
        confirmed: !!blockHeight && !failed,
        blockNumber: blockHeight,
        confirmations,
        pending: !blockHeight,
        failed,
      };
    } catch (err: any) {
      // If transaction is not found on node, check middleware before keeping pending.
      if (err.message?.includes('Transaction not found') || err.message?.includes('not found')) {
        const fallback = await fetchFromMiddleware(hash);
        return fallback ?? {
          confirmed: false,
          pending: true,
          failed: false,
        };
      }

      // For transient RPC/sdk errors try middleware; only if unavailable keep pending.
      try {
        const currentHeight = await sdk.getHeight();
        const fallback = await fetchFromMiddleware(hash, currentHeight);
        if (fallback) return fallback;
      } catch {
        // ignore middleware errors
      }
      return { confirmed: false, pending: true, failed: false };
    }
  }, [fetchFromMiddleware, sdk]);

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
