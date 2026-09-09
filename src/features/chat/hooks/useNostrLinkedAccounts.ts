/**
 * useNostrLinkedAccounts — accounts that have linked a Nostr key, i.e. the ones
 * you can start a DM with. Backs the "Suggested" section of the start-a-chat
 * dialog. Ported from
 * `superhero-app/src/features/chat/hooks/useNostrLinkedAccounts.ts`.
 *
 * Reads `GET /api/accounts?has_nostr=true` via the generated `AccountsService`.
 * The list response is loosely typed on the wire, so items are mapped
 * defensively to `{ address, chainName, nostrAddress }`; a row whose `links.nostr`
 * is absent still resolves on click via `fetchNostrLink`.
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AccountsService } from '@/api/generated';

export interface NostrLinkedAccount {
  address: string;
  chainName: string | null;
  nostrAddress: string | null;
}

export interface UseNostrLinkedAccountsOptions {
  limit?: number;
  enabled?: boolean;
}

interface RawAccount {
  address?: string;
  chain_name?: string | null;
  name?: string | null;
  links?: { nostr?: string | null } | null;
}

export function useNostrLinkedAccounts(
  search?: string,
  { limit = 20, enabled = true }: UseNostrLinkedAccountsOptions = {},
) {
  const term = (search ?? '').trim();

  const query = useQuery({
    queryKey: ['accounts', 'nostr-linked', term, limit],
    queryFn: () => AccountsService.listAll({
      hasNostr: true,
      search: term || undefined,
      orderBy: 'total_volume',
      orderDirection: 'DESC',
      limit,
      page: 1,
    }),
    enabled,
    staleTime: 1000 * 60,
  });

  const accounts = useMemo<NostrLinkedAccount[]>(() => {
    const raw = (query.data?.items ?? query.data ?? []) as RawAccount[];
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((a): a is RawAccount => !!a && typeof a.address === 'string')
      .map((a) => ({
        address: a.address as string,
        chainName: a.chain_name ?? a.name ?? null,
        nostrAddress: a.links?.nostr ?? null,
      }));
  }, [query.data]);

  return { accounts, query };
}
