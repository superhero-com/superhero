import { useQuery } from '@tanstack/react-query';
// @ts-ignore - generated client has no type re-export barrel
import { AccountsService } from '@/api/generated';
import { SuperheroApi } from '@/api/backend';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { ActiveMention } from '../utils/mentions';

export interface AccountMentionItem {
  type: 'account';
  address: string;
  chainName: string | null;
}

export interface TokenMentionItem {
  type: 'token';
  name: string;
  symbol: string;
  address?: string;
  saleAddress?: string;
}

export type MentionItem = AccountMentionItem | TokenMentionItem;

const MAX_RESULTS = 6;

/**
 * Typeahead results for the compose-side mention picker. Accounts come from the
 * backend's account typeahead (`/api/accounts/search`); tokens from the token
 * list search. The query is debounced; when no mention is active both queries
 * are disabled so nothing is fetched.
 */
export function useMentionSearch(active: ActiveMention | null): {
  items: MentionItem[];
  isLoading: boolean;
} {
  const trigger = active?.trigger ?? null;
  const debouncedQuery = useDebouncedValue(active?.query ?? '', 200);

  const accountQuery = trigger === 'account' ? debouncedQuery : '';
  const tokenQuery = trigger === 'token' ? debouncedQuery : '';

  const accounts = useQuery({
    queryKey: ['mention-accounts', accountQuery],
    queryFn: async (): Promise<AccountMentionItem[]> => {
      const res = await AccountsService.searchAccounts({ q: accountQuery, limit: MAX_RESULTS });
      const rows = Array.isArray(res) ? res : [];
      return rows.map((r: { address: string; chain_name: string | null }) => ({
        type: 'account' as const,
        address: r.address,
        chainName: r.chain_name,
      }));
    },
    // The backend returns [] for a blank query, so only search once a char is typed.
    enabled: trigger === 'account' && accountQuery.length >= 1,
    staleTime: 60_000,
  });

  const tokens = useQuery({
    queryKey: ['mention-tokens', tokenQuery],
    queryFn: async (): Promise<TokenMentionItem[]> => {
      const res: any = await SuperheroApi.listTokens({
        search: tokenQuery || undefined,
        orderBy: 'trending_score',
        orderDirection: 'DESC',
        limit: MAX_RESULTS,
      });
      const list = Array.isArray(res?.items) ? res.items : [];
      return list.map((tk: any) => ({
        type: 'token' as const,
        name: String(tk?.name ?? tk?.symbol ?? ''),
        symbol: String(tk?.symbol ?? ''),
        address: tk?.address,
        saleAddress: tk?.sale_address,
      })).filter((tk: TokenMentionItem) => tk.name);
    },
    // An empty token query surfaces the trending tokens as a starting point.
    enabled: trigger === 'token',
    staleTime: 60_000,
  });

  if (trigger === 'account') {
    return { items: accounts.data ?? [], isLoading: accounts.isFetching };
  }
  if (trigger === 'token') {
    return { items: tokens.data ?? [], isLoading: tokens.isFetching };
  }
  return { items: [], isLoading: false };
}
