import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { TokenListState } from '../types/dex';
import { mergeTokens } from '../utils/tokenList';
import { useCustomTokens } from './useCustomTokens';

type TokenPage = { items?: DexTokenDto[]; meta?: { totalPages?: number } };

const PAGE_SIZE = 100;
const MAX_PAGES = 10;

async function fetchAllDexTokens(): Promise<DexTokenDto[]> {
  const items: DexTokenDto[] = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result: TokenPage = await DexService.listAllDexTokens({
      limit: PAGE_SIZE,
      page,
      orderBy: 'pairs_count',
      orderDirection: 'DESC',
    });
    items.push(...(result?.items ?? []));
    const totalPages = Number(result?.meta?.totalPages ?? 1);
    if (page >= totalPages || (result?.items ?? []).length < PAGE_SIZE) break;
  }
  return items;
}

export function useTokenList(): TokenListState {
  const { data, isLoading } = useQuery({
    queryKey: ['DexService.listAllDexTokens', 'all'],
    queryFn: fetchAllDexTokens,
  });
  const { customTokens } = useCustomTokens();

  const tokens = useMemo(() => mergeTokens(
    [{
      address: 'AE', symbol: 'AE', name: 'AE', decimals: 18, is_ae: true,
    } as DexTokenDto],
    data ?? [],
    customTokens,
  ), [data, customTokens]);

  return { tokens, loading: isLoading };
}
