import { useEffect, useMemo } from 'react';
import { useAtom } from 'jotai';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  type ProfileAggregate,
  type ProfileFeedResponse,
  SuperheroApi,
} from '@/api/backend';
import { chainNamesAtom, profileDisplayNamesAtom } from '@/atoms/walletAtoms';

function normalizeProfileFeed(payload: ProfileFeedResponse | undefined): ProfileAggregate[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export function useProfileFeed(options?: {
  limit?: number;
  offset?: number;
  refetchIntervalMs?: number;
}) {
  const queryClient = useQueryClient();
  const [, setChainNames] = useAtom(chainNamesAtom);
  const [, setProfileDisplayNames] = useAtom(profileDisplayNamesAtom);
  const limit = options?.limit ?? 500;
  const offset = options?.offset ?? 0;
  const refetchIntervalMs = options?.refetchIntervalMs ?? 20_000;

  const query = useQuery({
    queryKey: ['SuperheroApi.getProfileFeed', limit, offset],
    queryFn: () => SuperheroApi.getProfileFeed(limit, offset),
    staleTime: refetchIntervalMs,
    refetchInterval: refetchIntervalMs,
    refetchOnWindowFocus: false,
  });

  const profiles = useMemo(
    () => normalizeProfileFeed(query.data),
    [query.data],
  );

  useEffect(() => {
    if (!profiles.length) return;

    const nextChainNames: Record<string, string> = {};
    const nextDisplayNames: Record<string, string> = {};
    profiles.forEach((profile) => {
      if (!profile?.address) return;
      queryClient.setQueryData(['SuperheroApi.getProfile', profile.address], profile);

      const chainName = (profile.profile?.chain_name || '').trim();
      if (chainName) {
        nextChainNames[profile.address] = chainName;
      }
      const displayName = (profile.public_name || '').trim();
      if (displayName) {
        nextDisplayNames[profile.address] = displayName;
      }
    });

    if (Object.keys(nextChainNames).length) {
      setChainNames((prev) => ({ ...prev, ...nextChainNames }));
    }
    if (Object.keys(nextDisplayNames).length) {
      setProfileDisplayNames((prev) => ({ ...prev, ...nextDisplayNames }));
    }
  }, [profiles, queryClient, setChainNames, setProfileDisplayNames]);

  return query;
}
