import { useInfiniteQuery } from '@tanstack/react-query';
import { useSocialGraphConfig, socialGraphScope } from './useSocialGraph';
import {
  SocialGraphConnectionsService,
  type SocialGraphAccount,
  type SocialGraphConnectionsPage,
} from '../api/socialGraphConnections';

export type ConnectionsDirection = 'followers' | 'following';

const PAGE_SIZE = 20;

/**
 * Followers or following for `address`, newest first, filtered by `search` and
 * paged with the API's opaque keyset cursor for scroll-down load-more. Returns a
 * flattened `items` list on top of the raw pages so a caller renders rows without
 * knowing about pagination.
 */
export function useSocialConnections(
  direction: ConnectionsDirection,
  address?: string,
  search?: string,
) {
  const trimmed = search?.trim() || undefined;
  const { data: config } = useSocialGraphConfig();
  const enabled = !!address && address.startsWith('ak_') && !!config?.contract_address;

  const query = useInfiniteQuery<SocialGraphConnectionsPage>({
    queryKey: ['SocialGraphConnections', ...socialGraphScope(), config?.contract_address, direction, address, trimmed],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => {
      const params = {
        address: address!,
        search: trimmed,
        cursor: pageParam as string | undefined,
        limit: PAGE_SIZE,
      };
      return direction === 'followers'
        ? SocialGraphConnectionsService.listSocialGraphFollowers(params)
        : SocialGraphConnectionsService.listSocialGraphFollowing(params);
    },
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    staleTime: 30_000,
  });

  const items: SocialGraphAccount[] = query.data?.pages.flatMap((p) => p.items) ?? [];

  return { ...query, items };
}
