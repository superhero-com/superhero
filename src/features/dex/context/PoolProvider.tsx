import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LiquidityPosition } from '../types/pool';

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
  
  // Helper functions
  selectPositionForAdd: (position: LiquidityPosition) => void;
  selectPositionForRemove: (position: LiquidityPosition) => void;
  clearSelection: () => void;
}

const PoolContext = createContext<PoolContextType | undefined>(undefined);

interface PoolProviderProps {
  children: ReactNode;
}

export function PoolProvider({ children }: PoolProviderProps) {
  const [currentAction, setCurrentAction] = useState<PoolAction>(null);
  const [selectedPosition, setSelectedPosition] = useState<LiquidityPosition | null>(null);
  const [selectedTokenA, setSelectedTokenA] = useState<string>('');
  const [selectedTokenB, setSelectedTokenB] = useState<string>('');

  const setSelectedTokens = (tokenA: string, tokenB: string) => {
    setSelectedTokenA(tokenA);
    setSelectedTokenB(tokenB);
  };

  const selectPositionForAdd = (position: LiquidityPosition) => {
    console.log('selectPositionForAdd called:', position);
    setSelectedPosition(position);
    setSelectedTokens(position.token0, position.token1);
    setCurrentAction('add');
    console.log('Context updated for add:', { 
      token0: position.token0, 
      token1: position.token1, 
      action: 'add' 
    });
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

  const value: PoolContextType = {
    currentAction,
    setCurrentAction,
    selectedPosition,
    setSelectedPosition,
    selectedTokenA,
    selectedTokenB,
    setSelectedTokens,
    selectPositionForAdd,
    selectPositionForRemove,
    clearSelection,
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
