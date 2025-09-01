import { useEffect, useState, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { LiquidityPosition, PoolListState } from '../types/pool';
import { useWallet, useDex, useAeSdk } from '../../../hooks';
import {
  getPositionsForAccountAtom,
  isLoadingForAccountAtom,
  getErrorForAccountAtom,
  setPositionsForAccountAtom,
  setLoadingForAccountAtom,
  setErrorForAccountAtom,
  shouldRefreshPositionsAtom,
  invalidatePositionsAtom
} from '../atoms/positionsAtoms';

export function useLiquidityPositions(): PoolListState & { 
  refreshPositions: () => Promise<void>;
  invalidateCache: () => void;
} {
  const { activeAccount } = useAeSdk()
  const { providedLiquidity, scanAccountLiquidity } = useDex();
  
  // Jotai atoms
  const getPositionsForAccount = useAtomValue(getPositionsForAccountAtom);
  const isLoadingForAccount = useAtomValue(isLoadingForAccountAtom);
  const getErrorForAccount = useAtomValue(getErrorForAccountAtom);
  const shouldRefreshPositions = useAtomValue(shouldRefreshPositionsAtom);
  const setPositionsForAccount = useSetAtom(setPositionsForAccountAtom);
  const setLoadingForAccount = useSetAtom(setLoadingForAccountAtom);
  const setErrorForAccount = useSetAtom(setErrorForAccountAtom);
  const invalidatePositions = useSetAtom(invalidatePositionsAtom);
  
  // Local UI state
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Get cached positions or empty array
  const cachedPositions = activeAccount ? getPositionsForAccount(activeAccount) : [];
  const loading = activeAccount ? isLoadingForAccount(activeAccount) : false;
  const error = activeAccount ? getErrorForAccount(activeAccount) : null;
  const shouldRefresh = activeAccount ? shouldRefreshPositions(activeAccount) : false;

  // Function to load positions from the dex store and cache them
  const loadAndCachePositions = useCallback(async (accountAddress: string) => {
    try {
      setLoadingForAccount({ address: accountAddress, loading: true });
      setErrorForAccount({ address: accountAddress, error: null });

      // Scan account liquidity
      await scanAccountLiquidity(accountAddress);

      // Get positions from Jotai store
      const providedRaw = providedLiquidity[accountAddress];
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

      // Cache the positions
      setPositionsForAccount({ address: accountAddress, positions });
      setLoadingForAccount({ address: accountAddress, loading: false });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load liquidity positions';
      setErrorForAccount({ address: accountAddress, error: errorMessage });
      setLoadingForAccount({ address: accountAddress, loading: false });
    }
  }, [scanAccountLiquidity, providedLiquidity, setPositionsForAccount, setLoadingForAccount, setErrorForAccount]);

  // Refresh positions manually
  const refreshPositions = useCallback(async () => {
    console.log("[useLiquidityPositions] refreshPositions->activeAccount", activeAccount);
    if (!activeAccount) return;
    await loadAndCachePositions(activeAccount);
  }, [activeAccount, loadAndCachePositions]);

  // Invalidate cache manually
  const invalidateCache = useCallback(() => {
    if (!activeAccount) return;
    invalidatePositions(activeAccount);
  }, [activeAccount, invalidatePositions]);

  // Load positions on mount or when address changes
  useEffect(() => {
    if (!activeAccount) return;

    // Load positions if not cached or if they need refresh
    if (cachedPositions.length === 0 || shouldRefresh) {
      loadAndCachePositions(activeAccount);
    }
  }, [activeAccount, cachedPositions.length, shouldRefresh, loadAndCachePositions]);

  return {
    positions: cachedPositions,
    loading,
    error,
    showImport,
    showCreate,
    refreshPositions,
    invalidateCache,
  };
}
