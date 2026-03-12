import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  type ProfileAggregate,
  type ProfileFeedResponse,
  SuperheroApi,
} from '@/api/backend';

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

  return { ...query, profiles };
}
