import { useWallet } from './useWallet';

export type ActiveChainId = 'aeternity' | 'solana';

export const useActiveChain = () => {
  const { selectedChain, setSelectedChain } = useWallet();
  return { selectedChain: selectedChain as ActiveChainId, setSelectedChain };
};
