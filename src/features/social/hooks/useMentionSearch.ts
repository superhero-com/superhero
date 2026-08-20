import { useQuery } from '@tanstack/react-query';
// @ts-ignore - generated client has no type re-export barrel
import { AccountsService } from '@/api/generated';
import { SuperheroApi } from '@/api/backend';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { type ActiveMention, isRenderableTokenName } from '../utils/mentions';

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

/** Typeahead results (accounts + tokens) for the compose-side mention picker. */
export function useMentionSearch(active: ActiveMention | null, tokenAllowedChars = ''): {
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
      // `order_by=trending_score` applies the trending ELIGIBILITY gate, not just a
      // sort — it silently drops most matches. Rank by trending only for the empty
      // cold-start query; a named search must reach every matching token.
      const res: any = await SuperheroApi.listTokens({
        search: tokenQuery || undefined,
        ...(tokenQuery ? {} : { orderBy: 'trending_score' as const, orderDirection: 'DESC' as const }),
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
    // Drop tokens whose name would truncate on render (e.g. contains '.' or '_').
    const items = (tokens.data ?? [])
      .filter((tk) => isRenderableTokenName(tk.name, tokenAllowedChars));
    return { items, isLoading: tokens.isFetching };
  }
  return { items: [], isLoading: false };
}
