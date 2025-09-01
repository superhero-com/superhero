import { useEffect, useState, useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import BigNumber from 'bignumber.js';
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
  addOptimisticPosition: (position: LiquidityPosition) => void;
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
      const accountLiquidity = providedLiquidity[accountAddress] || {};
      const provided = accountLiquidity;

      // Convert to our typed format
      const positions: LiquidityPosition[] = Object.entries(provided)
        .map(([pairId, info]) => {
          if (!info) return null;
          return {
            pairId,
            token0: info.token0,
            token1: info.token1,
            balance: info.balance,
            sharePct: info.sharePct,
            valueUsd: info.valueUsd,
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

  // Add a new position optimistically (before blockchain confirmation)
  const addOptimisticPosition = useCallback((newPosition: LiquidityPosition) => {
    if (!activeAccount) return;
    
    // Get current positions and add the new one
    const currentPositions = getPositionsForAccount(activeAccount);
    
    // Check if position already exists (by pairId)
    const existingIndex = currentPositions.findIndex(p => p.pairId === newPosition.pairId);
    
    let updatedPositions: LiquidityPosition[];
    if (existingIndex >= 0) {
      // Update existing position by adding to balance
      updatedPositions = [...currentPositions];
      const existing = updatedPositions[existingIndex];
      const existingBalance = new BigNumber(existing.balance || '0');
      const newBalance = new BigNumber(newPosition.balance || '0');
      const totalBalance = existingBalance.plus(newBalance);
      
      updatedPositions[existingIndex] = {
        ...existing,
        balance: totalBalance.toString(),
        sharePct: newPosition.sharePct || existing.sharePct,
        valueUsd: newPosition.valueUsd || existing.valueUsd,
      };
    } else {
      // Add new position
      updatedPositions = [...currentPositions, newPosition];
    }
    
    // Update the positions in the store
    setPositionsForAccount({ address: activeAccount, positions: updatedPositions });
  }, [activeAccount, getPositionsForAccount, setPositionsForAccount]);

  // Load positions on mount or when address changes
  useEffect(() => {
    if (!activeAccount) return;

    // Load positions if not cached or if they need refresh
    if (cachedPositions.length === 0 || shouldRefresh) {
      loadAndCachePositions(activeAccount);
    }
  }, [activeAccount, cachedPositions.length, shouldRefresh]);

  return {
    positions: cachedPositions,
    loading,
    error,
    showImport,
    showCreate,
    refreshPositions,
    invalidateCache,
    addOptimisticPosition,
  };
}
