import { useEffect, useState } from 'react';
import { LiquidityPosition, PoolListState } from '../types/pool';
import { useWallet, useDex } from '../../../hooks';

export function useLiquidityPositions(): PoolListState {
  const { address } = useWallet();
  const { providedLiquidity, scanAccountLiquidity } = useDex();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Get liquidity positions from Jotai store
  const providedRaw = providedLiquidity[address || ''];
  const provided = providedRaw || {};

  // Convert to our typed format
  const positions: LiquidityPosition[] = Object.entries(provided)
    .map(([pairId, info]) => {
      if (!info) return null;
      return {
        pairId,
        token0: (info as any).token0,
        token1: (info as any).token1,
        balance: (info as any).balance,
        sharePct: (info as any).sharePct,
        valueUsd: (info as any).valueUsd,
      };
    })
    .filter(Boolean) as LiquidityPosition[];

  useEffect(() => {
    if (!address) return;

    setLoading(true);
    setError(null);

    scanAccountLiquidity(address)
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load liquidity positions');
        setLoading(false);
      });
  }, [address, scanAccountLiquidity]);

  return {
    positions,
    loading,
    error,
    showImport,
    showCreate,
  };
}
