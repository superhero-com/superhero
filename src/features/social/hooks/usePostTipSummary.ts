import { useQuery } from '@tanstack/react-query';
import { SuperheroApi } from '../../../api/backend';
import { useActiveChain } from '@/hooks/useActiveChain';

function normalizePostIdV3(postId: string): string {
  return String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`;
}

export function usePostTipSummary(postId?: string) {
  const { selectedChain } = useActiveChain();
  const id = postId ? normalizePostIdV3(postId) : undefined;

  return useQuery<{ totalTips?: string } | undefined>({
    queryKey: ['post-tip-summary', selectedChain, id],
    queryFn: async () => {
      if (!id) return undefined;
      try {
        return await SuperheroApi.getPostTipSummary(id);
      } catch {
        return undefined;
      }
    },
    enabled: Boolean(id && selectedChain === 'aeternity'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}


