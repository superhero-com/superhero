import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LiquidityPosition } from '../types/pool';
import { useAccount } from '../../../hooks';
import { useSetAtom } from 'jotai';
import { invalidatePositionsAtom } from '../atoms/positionsAtoms';

export type PoolAction = 'add' | 'remove' | null;

interface PoolContextType {
  // Current action state
  currentAction: PoolAction;
  setCurrentAction: (action: PoolAction) => void;
  
  // Selected position for operations
  selectedPosition: LiquidityPosition | null;
  setSelectedPosition: (position: LiquidityPosition | null) => void;
  
  // Token selection for new liquidity
  selectedTokenA: string;
  selectedTokenB: string;
  setSelectedTokens: (tokenA: string, tokenB: string) => void;
  
  // Position refresh functionality
  refreshPositions: (() => Promise<void>) | null;
  setRefreshPositions: (refreshFn: (() => Promise<void>) | null) => void;
  
  // Helper functions
  selectPositionForAdd: (position: LiquidityPosition) => void;
  selectPositionForRemove: (position: LiquidityPosition) => void;
  clearSelection: () => void;
  
  // Auto-refresh after operations
  onPositionUpdated: () => Promise<void>;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

interface PoolProviderProps {
  children: ReactNode;
}

export function PoolProvider({ children }: PoolProviderProps) {
  const { activeAccount } = useAccount();
  const invalidatePositions = useSetAtom(invalidatePositionsAtom);
  const [currentAction, setCurrentAction] = useState<PoolAction>(null);
  const [selectedPosition, setSelectedPosition] = useState<LiquidityPosition | null>(null);
  const [selectedTokenA, setSelectedTokenA] = useState<string>('');
  const [selectedTokenB, setSelectedTokenB] = useState<string>('');
  const [refreshPositions, setRefreshPositions] = useState<(() => Promise<void>) | null>(null);

  const setSelectedTokens = (tokenA: string, tokenB: string) => {
    setSelectedTokenA(tokenA);
    setSelectedTokenB(tokenB);
  };

  const selectPositionForAdd = (position: LiquidityPosition) => {
    setSelectedPosition(position);
    setSelectedTokens(position.token0, position.token1);
    setCurrentAction('add');
  };

  const selectPositionForRemove = (position: LiquidityPosition) => {
    setSelectedPosition(position);
    setSelectedTokens(position.token0, position.token1);
    setCurrentAction('remove');
  };

  const clearSelection = () => {
    setCurrentAction(null);
    setSelectedPosition(null);
    setSelectedTokens('', '');
  };

  const onPositionUpdated = async () => {
    // Invalidate cached positions; the positions hook effect will reload
    if (activeAccount) {
      invalidatePositions(activeAccount);
    }
    // If a refresh function is provided, call it as well
    if (refreshPositions) {
      await refreshPositions();
    }
  };

  const value: PoolContextType = {
    currentAction,
    setCurrentAction,
    selectedPosition,
    setSelectedPosition,
    selectedTokenA,
    selectedTokenB,
    setSelectedTokens,
    refreshPositions,
    setRefreshPositions,
    selectPositionForAdd,
    selectPositionForRemove,
    clearSelection,
    onPositionUpdated,
  };

  return (
    <PoolContext.Provider value={value}>
      {children}
    </PoolContext.Provider>
  );
}

export function usePool() {
  const context = useContext(PoolContext);
  if (context === undefined) {
    throw new Error('usePool must be used within a PoolProvider');
  }
  return context;
}
