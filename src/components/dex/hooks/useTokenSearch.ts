import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { CONFIG } from '../../../config';
import {
  isContractAddress, mergeTokens, MiddlewareAex9Token, tokenFromMiddleware,
} from '../utils/tokenList';

const SEARCH_LIMIT = 20;

async function searchMiddleware(term: string): Promise<DexTokenDto[]> {
  const params = new URLSearchParams({ by: 'symbol', prefix: term, limit: String(SEARCH_LIMIT) });
  try {
    const response = await fetch(`${CONFIG.MIDDLEWARE_URL}/v3/aex9?${params}`);
    if (!response.ok) return [];
    const body = await response.json() as { data?: MiddlewareAex9Token[] };
    return (body.data ?? [])
      .map(tokenFromMiddleware)
      .filter((token): token is DexTokenDto => !!token);
  } catch {
    return [];
  }
}

async function searchDex(term: string): Promise<DexTokenDto[]> {
  try {
    const result: { items?: DexTokenDto[] } = await DexService.listAllDexTokens({
      search: term, limit: SEARCH_LIMIT, page: 1,
    });
    return result?.items ?? [];
  } catch {
    return [];
  }
}

/** Search the DEX and every AEX9 token on chain by name / symbol. */
export function useTokenSearch(search: string, delayMs = 300) {
  const [term, setTerm] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setTerm(search.trim()), delayMs);
    return () => clearTimeout(id);
  }, [search, delayMs]);

  const enabled = term.length >= 2 && !isContractAddress(term);
  const { data, isFetching } = useQuery({
    queryKey: ['dex-token-search', term],
    queryFn: async () => {
      const [dexTokens, chainTokens] = await Promise.all([searchDex(term), searchMiddleware(term)]);
      return mergeTokens(dexTokens, chainTokens);
    },
    enabled,
    staleTime: 60_000,
  });

  return { results: enabled ? data ?? [] : [], loading: enabled && isFetching };
}
