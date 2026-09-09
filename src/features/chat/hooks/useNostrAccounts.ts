/**
 * useNostrAccounts — reverse-resolve nostr pubkeys → the æternity accounts that
 * linked them, so chat surfaces can show the AE identity (chain name / `ak_`
 * address) instead of a raw hex pubkey. Ported from
 * `superhero-app/src/features/chat/hooks/useNostrAccounts.ts`.
 *
 * One batched `GET /api/accounts/by-nostr` (generated `AccountsService`), cached
 * on the sorted pubkey set. `labelFor` applies "chain name → `ak_` → fallback".
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { AccountsService } from '@/api/generated';
import { formatAddress } from '@/utils/address';
import type { NostrAccountRefDto } from '@/api/generated';

export interface UseNostrAccountsResult {
  byPubkey: Record<string, NostrAccountRefDto>;
  accountFor: (pubkey: string) => NostrAccountRefDto | undefined;
  labelFor: (pubkey: string, fallback: string) => string;
  isLoading: boolean;
}

export function useNostrAccounts(pubkeys: string[]): UseNostrAccountsResult {
  const keys = useMemo(
    () => Array.from(new Set(pubkeys.map((p) => p.trim().toLowerCase()).filter(Boolean))).sort(),
    [pubkeys],
  );

  const query = useQuery({
    queryKey: ['nostr-accounts', keys],
    queryFn: () => AccountsService.resolveByNostr({ pubkeys: keys.join(',') }),
    enabled: keys.length > 0,
    staleTime: 1000 * 60 * 5,
  });

  const byPubkey = useMemo(() => {
    const out: Record<string, NostrAccountRefDto> = {};
    (query.data ?? []).forEach((ref) => {
      if (ref.nostr_pubkey) out[ref.nostr_pubkey.toLowerCase()] = ref;
    });
    return out;
  }, [query.data]);

  const accountFor = useCallback(
    (pubkey: string) => byPubkey[pubkey?.toLowerCase()],
    [byPubkey],
  );

  const labelFor = useCallback((pubkey: string, fallback: string) => {
    const ref = byPubkey[pubkey?.toLowerCase()];
    if (ref?.chain_name) return ref.chain_name;
    if (ref?.address) return formatAddress(ref.address);
    return fallback;
  }, [byPubkey]);

  return {
    byPubkey, accountFor, labelFor, isLoading: query.isLoading,
  };
}
