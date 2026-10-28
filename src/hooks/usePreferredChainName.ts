import { useCallback, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AccountsService } from '../api/generated/services/AccountsService';
import { preferredChainNamesAtom } from '../atoms/walletAtoms';
import {
  PREFERRED_CHAIN_NAME_POLL_MS,
  isPreferredChainNamePending,
  mergeServerChainName,
  resolveAccountChainName,
  setPendingChainName,
} from '../utils/preferredChainName';

const accountQueryKey = (address: string) => ['AccountsService.getAccount', address];
const preferredChainNameQueryKey = (address: string) => ['preferredChainName', address];

/**
 * Keep the display .chain name of `address` in line with the account the API
 * returns, where the preferred name the user linked wins over the newest name
 * they own. While a just-picked name is still pending, the account is re-read
 * until the API reports it, and the account cache is then refreshed so the
 * profile follows.
 *
 * Reads through its own query key: the profile editor patches the account
 * cache optimistically, which must not count as the API confirming the name.
 */
export function usePreferredChainNameSync(address?: string | null) {
  const normalizedAddress = String(address || '').trim();
  const queryClient = useQueryClient();
  const preferredNames = useAtomValue(preferredChainNamesAtom);
  const setPreferredNames = useSetAtom(preferredChainNamesAtom);
  const isPending = isPreferredChainNamePending(preferredNames[normalizedAddress]);

  const { data: server, dataUpdatedAt, isSuccess } = useQuery({
    queryKey: preferredChainNameQueryKey(normalizedAddress),
    queryFn: async () => resolveAccountChainName(
      await AccountsService.getAccount({ address: normalizedAddress }) as any,
    ),
    enabled: normalizedAddress.startsWith('ak_'),
    staleTime: 60_000,
    refetchInterval: isPending ? PREFERRED_CHAIN_NAME_POLL_MS : false,
  });

  useEffect(() => {
    if (!normalizedAddress || !isSuccess || !server) return;
    let confirmed = false;
    setPreferredNames((prev) => {
      const next = mergeServerChainName(prev, normalizedAddress, server);
      confirmed = next !== prev && Boolean(prev[normalizedAddress]?.pendingUntil);
      return next;
    });
    if (confirmed) {
      queryClient.invalidateQueries({ queryKey: accountQueryKey(normalizedAddress) });
      queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', normalizedAddress] });
    }
  }, [dataUpdatedAt, isSuccess, normalizedAddress, queryClient, server, setPreferredNames]);
}

/**
 * The display .chain name of `address` as last known, and whether it is a name
 * the user just picked that the API has not reported yet.
 */
export function usePreferredChainName(address?: string | null): {
  name: string | null;
  isPending: boolean;
} {
  const normalizedAddress = String(address || '').trim();
  const preferredNames = useAtomValue(preferredChainNamesAtom);
  const entry = preferredNames[normalizedAddress];
  return {
    name: entry?.name ?? null,
    isPending: isPreferredChainNamePending(entry),
  };
}

/**
 * Show a name the user just linked or claimed everywhere right away, then
 * re-read the account so the profile follows once the API has indexed it.
 */
export function useApplyPendingChainName() {
  const queryClient = useQueryClient();
  const setPreferredNames = useSetAtom(preferredChainNamesAtom);

  return useCallback((address: string, name: string | null) => {
    if (!address) return;
    const chainName = String(name || '').trim().toLowerCase();
    setPreferredNames((prev) => setPendingChainName(prev, address, chainName || null));
    queryClient.invalidateQueries({ queryKey: preferredChainNameQueryKey(address) });
    queryClient.invalidateQueries({ queryKey: accountQueryKey(address) });
    queryClient.invalidateQueries({ queryKey: ['SuperheroApi.getProfile', address] });
  }, [queryClient, setPreferredNames]);
}
