import { useAtom } from 'jotai';
import {
  useEffect, useMemo, useCallback, useRef,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import {
  type ProfileAggregate,
  SuperheroApi,
} from '@/api/backend';
import { resolveDisplayName } from '@/utils/displayName';

type UseAccountDisplayNamesOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
  includeOnChain?: boolean;
};

type GetDisplayNameOptions = {
  fallbackToAddress?: boolean;
  fallbackLabel?: string;
};

export function useAccountDisplayNames(
  addresses: string[],
  options?: UseAccountDisplayNamesOptions,
) {
  const [chainNames, setChainNames] = useAtom(chainNamesAtom);
  const queryClient = useQueryClient();
  const stableInputAddressesRef = useRef<string[]>([]);
  const stableNormalizedAddressesRef = useRef<string[]>([]);

  const nextInputAddresses = (addresses || []).map((address) => String(address || '').trim());
  const inputAddressesChanged = stableInputAddressesRef.current.length !== nextInputAddresses.length
    || stableInputAddressesRef.current.some((address, index) => address !== nextInputAddresses[index]);

  if (inputAddressesChanged) {
    stableInputAddressesRef.current = nextInputAddresses;
    stableNormalizedAddressesRef.current = Array.from(
      new Set(nextInputAddresses.filter(Boolean)),
    ).sort();
  }

  const normalizedAddresses = stableNormalizedAddressesRef.current;

  const query = useQuery({
    queryKey: [
      'SuperheroApi.getProfilesByAddresses',
      normalizedAddresses,
      options?.includeOnChain ?? null,
    ],
    queryFn: () => SuperheroApi.getProfilesByAddresses(
      normalizedAddresses,
      options?.includeOnChain,
    ),
    enabled: (options?.enabled ?? true) && normalizedAddresses.length > 0,
    staleTime: options?.staleTime ?? 60_000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
  });

  const profilesByAddress = useMemo<Record<string, ProfileAggregate>>(
    () => (query.data || []).reduce<Record<string, ProfileAggregate>>((acc, profile) => {
      const address = String(profile?.address || '').trim();
      if (address) acc[address] = profile;
      return acc;
    }, {}),
    [query.data],
  );

  useEffect(() => {
    if (!query.data?.length) return;

    const nextChainNames: Record<string, string> = {};

    query.data.forEach((profile) => {
      const address = String(profile?.address || '').trim();
      if (!address) return;

      queryClient.setQueryData(['SuperheroApi.getProfile', address], profile);

      const chainName = String(profile?.profile?.chain_name || '').trim();
      if (chainName) {
        nextChainNames[address] = chainName;
      }
    });

    if (Object.keys(nextChainNames).length) {
      setChainNames((prev) => ({ ...prev, ...nextChainNames }));
    }
  }, [query.data, queryClient, setChainNames]);

  const getDisplayName = useCallback((
    address: string,
    getOptions?: GetDisplayNameOptions,
  ) => {
    const normalizedAddress = String(address || '').trim();
    const profile = profilesByAddress[normalizedAddress];
    const fallbackLabel = String(getOptions?.fallbackLabel || '').trim();
    const displayName = resolveDisplayName({
      publicName: profile?.public_name,
      chainName: profile?.profile?.chain_name || chainNames[normalizedAddress],
      address: getOptions?.fallbackToAddress === false ? undefined : normalizedAddress,
    });

    return displayName || fallbackLabel;
  }, [profilesByAddress, chainNames]);

  const getHeaderLabel = useCallback((
    address: string,
    getOptions?: GetDisplayNameOptions,
  ) => {
    const normalizedAddress = String(address || '').trim();
    const publicName = String(profilesByAddress[normalizedAddress]?.public_name || '').trim();
    if (publicName) return `@${publicName}`;
    return getDisplayName(normalizedAddress, getOptions);
  }, [profilesByAddress, getDisplayName]);

  return {
    ...query,
    profilesByAddress,
    getDisplayName,
    getHeaderLabel,
  };
}
