import { useQuery } from '@tanstack/react-query';
import { SuperheroApi } from '@/api/backend';
import { resolveDisplayName } from '@/utils/displayName';
import { useChainName } from './useChainName';

type UseAccountDisplayNameOptions = {
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number | false;
};

export function useAccountDisplayName(
  address: string,
  options?: UseAccountDisplayNameOptions,
) {
  const normalizedAddress = String(address || '').trim();
  const { chainName } = useChainName(normalizedAddress);
  const query = useQuery({
    queryKey: ['SuperheroApi.getProfile', normalizedAddress],
    queryFn: () => SuperheroApi.getProfile(normalizedAddress),
    enabled: (options?.enabled ?? true) && !!normalizedAddress,
    staleTime: options?.staleTime ?? 60_000,
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
  });

  const displayName = resolveDisplayName({
    publicName: query.data?.public_name,
    chainName: query.data?.profile?.chain_name || chainName,
    address: normalizedAddress,
  });

  return {
    ...query,
    chainName,
    displayName,
  };
}
