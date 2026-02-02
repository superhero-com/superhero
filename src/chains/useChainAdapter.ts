import { useMemo } from 'react';
import { useActiveChain } from '@/hooks/useActiveChain';
import type { ChainAdapter, ChainId } from './types';
import { aeternityAdapter } from './aeternity/adapter';
import { createSolanaAdapter } from './solana/adapter';
import { useSolanaWallet } from './solana/hooks/useSolanaWallet';

export const getChainAdapter = (chainId: ChainId, connection?: any): ChainAdapter => {
  if (chainId === 'solana') return createSolanaAdapter(connection || null);
  return aeternityAdapter;
};

export const useChainAdapter = () => {
  const { selectedChain } = useActiveChain();
  const { connection } = useSolanaWallet();

  return useMemo(() => {
    if (selectedChain === 'solana') return createSolanaAdapter(connection || null);
    return aeternityAdapter;
  }, [selectedChain, connection]);
};
