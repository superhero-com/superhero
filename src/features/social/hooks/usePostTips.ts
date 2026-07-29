import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import moment from 'moment';

import { TipsService } from '@/api/generated/services/TipsService';
import { DATE_LONG } from '@/utils/constants';

export type PostTip = {
  hash: string;
  sender: string;
  amountAe: string;
  date: string;
  microTime?: number;
};

function normalizePostIdV3(postId: string): string {
  return String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`;
}

function formatTipDate(createdAt?: string): string {
  if (!createdAt) return 'Unknown';
  const d = moment(createdAt);
  return d.isValid() ? d.format(DATE_LONG) : 'Unknown';
}

export function usePostTips(postId?: string, receiverAddress?: string) {
  const queryKey = useMemo(() => {
    const id = postId ? normalizePostIdV3(postId) : undefined;
    return ['post-tips', id, receiverAddress] as const;
  }, [postId, receiverAddress]);

  return useQuery<PostTip[]>({
    queryKey,
    enabled: Boolean(postId && receiverAddress),
    staleTime: 30_000,
    queryFn: async () => {
      if (!postId || !receiverAddress) return [];

      // Backend filters by post_id (and receiver) directly, so this is a
      // single indexed query instead of paging the receiver's entire
      // middleware transaction history client-side.
      const response = await TipsService.listTips({
        postId: normalizePostIdV3(postId),
        receiver: receiverAddress,
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: 100,
      }) as any;

      const items: any[] = Array.isArray(response?.items) ? response.items : [];

      return items
        .map((t): PostTip => ({
          hash: t.tx_hash,
          sender: String(t.sender_address || t.sender?.address || ''),
          amountAe: String(t.amount ?? '0'),
          date: formatTipDate(t.created_at),
          microTime: t.created_at ? new Date(t.created_at).getTime() : undefined,
        }))
        .filter((t) => t.sender);
    },
  });
}
