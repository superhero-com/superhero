import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../store/store';
import { scanAccountLiquidity } from '../../../store/slices/dexSlice';
import { LiquidityPosition, PoolListState } from '../types/pool';

export function useLiquidityPositions(): PoolListState {
  const dispatch = useDispatch<AppDispatch>();
  const address = useSelector((s: RootState) => s.root.address);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Get liquidity positions from Redux store
  const providedRaw = useSelector((s: RootState) => s.dex.providedLiquidity[address || '']);
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

    dispatch(scanAccountLiquidity(address))
      .then(() => {
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load liquidity positions');
        setLoading(false);
      });
  }, [address, dispatch]);

  return {
    positions,
    loading,
    error,
    showImport,
    showCreate,
  };
}
