import { DexService, PairDto } from '@/api/generated';

import { providedLiquidityAtom, useAccount, useAeSdk } from '@/hooks';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useState } from 'react';
import {
  getErrorForAccountAtom,
  getPositionsForAccountAtom,
  isLoadingForAccountAtom,
  setErrorForAccountAtom,
  setLoadingForAccountAtom,
  setPositionsForAccountAtom,
  shouldRefreshPositionsAtom
} from '../atoms/positionsAtoms';
import { LiquidityPosition, PoolListState } from '../types/pool';
export function useLiquidityPositions(): PoolListState & {
  refreshPositions: () => Promise<void>;
} {
  const { aex9Balances, loadAccountAex9Balances } = useAccount()

  const { activeAccount } = useAeSdk()
  const [providedLiquidity, setProvidedLiquidity] = useAtom(providedLiquidityAtom);

  // Jotai atoms
  const getPositionsForAccount = useAtomValue(getPositionsForAccountAtom);
  const isLoadingForAccount = useAtomValue(isLoadingForAccountAtom);
  const getErrorForAccount = useAtomValue(getErrorForAccountAtom);
  const shouldRefreshPositions = useAtomValue(shouldRefreshPositionsAtom);
  const setPositionsForAccount = useSetAtom(setPositionsForAccountAtom);
  const setLoadingForAccount = useSetAtom(setLoadingForAccountAtom);
  const setErrorForAccount = useSetAtom(setErrorForAccountAtom);

  // Local UI state
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  // Get cached positions or empty array
  const cachedPositions = activeAccount ? getPositionsForAccount(activeAccount) : [];
  const loading = activeAccount ? isLoadingForAccount(activeAccount) : false;
  const error = activeAccount ? getErrorForAccount(activeAccount) : null;
  const shouldRefresh = activeAccount ? shouldRefreshPositions(activeAccount) : false;

  const scanAccountLiquidity = useCallback(async (accountAddress: string) => {
    if (!accountAddress) return;

    const accountAex9Balances = await loadAccountAex9Balances();
    const listAllPairs: any = await DexService.listAllPairs({ limit: 1000, page: 1 });
    // const pairs = await getPairs(false);
    const pairs: PairDto[] = listAllPairs.items;

    const accountLiquidities = {}
    for (const pair of pairs) {
      // this should get from user balances.
      const balance = accountAex9Balances.find(b => b.contract_id === pair.address)?.amount || 0;
      if (balance && balance > 0n) {
        accountLiquidities[pair.address] = {
          accountAddress,
          pair,
          token0: pair.token0.address,
          token1: pair.token1.address,
          balance: balance.toString(),
        };
      }
    }

    setProvidedLiquidity(prev => {
      const accountLiquidity = prev[accountAddress] || {};
      return {
        ...prev,
        [accountAddress]: {
          ...accountLiquidity,
        },
      };
    });

    return accountLiquidities;
  }, [loadAccountAex9Balances, aex9Balances]);


  // Function to load positions from the dex store and cache them
  const loadAndCachePositions = useCallback(async (accountAddress: string) => {
    try {
      setLoadingForAccount({ address: accountAddress, loading: true });
      setErrorForAccount({ address: accountAddress, error: null });

      // Scan account liquidity
      const accountLiquidity = await scanAccountLiquidity(accountAddress);

      // Convert to our typed format
      const positions: LiquidityPosition[] = Object.values(accountLiquidity)
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
    if (!activeAccount) return;
    await loadAndCachePositions(activeAccount);
  }, [activeAccount, loadAndCachePositions]);

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
  };
}
