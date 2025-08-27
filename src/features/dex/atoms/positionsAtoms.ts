import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { LiquidityPosition } from '../types/pool';

// Cache for liquidity positions by account address
export const liquidityPositionsAtom = atomWithStorage<Record<string, LiquidityPosition[]>>(
  'liquidityPositions',
  {}
);

// Loading state for positions
export const positionsLoadingAtom = atom<Record<string, boolean>>({});

// Error state for positions
export const positionsErrorAtom = atom<Record<string, string | null>>({});

// Last update timestamp for positions by account
export const positionsLastUpdateAtom = atom<Record<string, number>>({});

// Derived atom to get positions for a specific account
export const getPositionsForAccountAtom = atom(
  (get) => (address: string) => {
    const allPositions = get(liquidityPositionsAtom);
    return allPositions[address] || [];
  }
);

// Derived atom to check if positions are loading for a specific account
export const isLoadingForAccountAtom = atom(
  (get) => (address: string) => {
    const loadingStates = get(positionsLoadingAtom);
    return loadingStates[address] || false;
  }
);

// Derived atom to get error for a specific account
export const getErrorForAccountAtom = atom(
  (get) => (address: string) => {
    const errors = get(positionsErrorAtom);
    return errors[address] || null;
  }
);

// Action atom to set positions for an account
export const setPositionsForAccountAtom = atom(
  null,
  (get, set, { address, positions }: { address: string; positions: LiquidityPosition[] }) => {
    const allPositions = get(liquidityPositionsAtom);
    set(liquidityPositionsAtom, {
      ...allPositions,
      [address]: positions
    });
    
    // Update last update timestamp
    const lastUpdates = get(positionsLastUpdateAtom);
    set(positionsLastUpdateAtom, {
      ...lastUpdates,
      [address]: Date.now()
    });
  }
);

// Action atom to set loading state for an account
export const setLoadingForAccountAtom = atom(
  null,
  (get, set, { address, loading }: { address: string; loading: boolean }) => {
    const loadingStates = get(positionsLoadingAtom);
    set(positionsLoadingAtom, {
      ...loadingStates,
      [address]: loading
    });
  }
);

// Action atom to set error for an account
export const setErrorForAccountAtom = atom(
  null,
  (get, set, { address, error }: { address: string; error: string | null }) => {
    const errors = get(positionsErrorAtom);
    set(positionsErrorAtom, {
      ...errors,
      [address]: error
    });
  }
);

// Action atom to invalidate positions cache for an account (force reload)
export const invalidatePositionsAtom = atom(
  null,
  (get, set, address: string) => {
    const allPositions = get(liquidityPositionsAtom);
    const newPositions = { ...allPositions };
    delete newPositions[address];
    set(liquidityPositionsAtom, newPositions);
    
    // Clear loading and error states
    const loadingStates = get(positionsLoadingAtom);
    const errors = get(positionsErrorAtom);
    const lastUpdates = get(positionsLastUpdateAtom);
    
    const newLoadingStates = { ...loadingStates };
    const newErrors = { ...errors };
    const newLastUpdates = { ...lastUpdates };
    
    delete newLoadingStates[address];
    delete newErrors[address];
    delete newLastUpdates[address];
    
    set(positionsLoadingAtom, newLoadingStates);
    set(positionsErrorAtom, newErrors);
    set(positionsLastUpdateAtom, newLastUpdates);
  }
);

// Utility atom to check if positions need refresh (older than 30 seconds)
export const shouldRefreshPositionsAtom = atom(
  (get) => (address: string) => {
    const lastUpdates = get(positionsLastUpdateAtom);
    const lastUpdate = lastUpdates[address];
    if (!lastUpdate) return true;
    
    const now = Date.now();
    const thirtySeconds = 30 * 1000;
    return (now - lastUpdate) > thirtySeconds;
  }
);
