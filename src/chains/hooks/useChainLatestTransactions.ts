import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useActiveChain } from '@/hooks/useActiveChain';
import { useLatestTransactions } from '@/hooks/useLatestTransactions';
import { SolanaApi } from '@/chains/solana/backend';
import { mapSolanaTradeToTransaction } from '@/chains/solana/utils/tokenMapping';

export function useChainLatestTransactions() {
  const { selectedChain } = useActiveChain();
  const ae = useLatestTransactions();

  const solanaQuery = useQuery({
    queryKey: ['solana-trades', 'latest', 50],
    queryFn: () => SolanaApi.listBclTrades({ limit: 50, page: 1, includes: 'token' }),
    enabled: selectedChain === 'solana',
    staleTime: 15_000,
  });

  const solanaTransactions = useMemo(() => {
    const items = solanaQuery.data?.items || [];
    return items.map(mapSolanaTradeToTransaction);
  }, [solanaQuery.data]);

  if (selectedChain === 'solana') {
    return { latestTransactions: solanaTransactions };
  }
  return ae;
}
