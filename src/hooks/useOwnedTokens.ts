import { useQuery } from '@tanstack/react-query';
import { AccountTokensService } from '@/api/generated';
import { useAeSdk } from './useAeSdk';

type AccountTokensResponse = {
  items?: unknown[];
  meta?: unknown;
};

type OwnedTokenLike = Record<string, any>;

/**
 * Shared query key for the "Owned Trends" list. Exported so flows that change
 * a user's holdings (e.g. token trades) can invalidate it for an immediate
 * refresh instead of relying on background polling.
 */
export const OWNED_TOKENS_QUERY_KEY = ['AccountTokensService.listTokenHolders', 'ownedTokens'] as const;

function extractTokenLike(item: unknown): OwnedTokenLike | null {
  if (!item || typeof item !== 'object') return null;

  // Matches how other parts of the app treat the account tokens response.
  // Usually it's `{ token, balance, ... }`, but some environments may return
  // "flattened" fields like `token_name` / `token_symbol`.
  const asAny = item as any;
  if (asAny?.token && typeof asAny.token === 'object') return asAny.token;

  // Fallback: if the API returns token-like fields on the item itself.
  const maybeTokenLike = asAny?.token_address
    || asAny?.token_name
    || asAny?.token_symbol
    || asAny?.sale_address
    || asAny?.address;
  if (maybeTokenLike) return asAny;

  return null;
}

/**
 * React hook for fetching tokens owned by the current user.
 *
 * Important: the app’s “Owned Trends” is backed by the account tokens endpoint
 * (`AccountTokensService.listTokenHolders`), not `TokensService.listAll`.
 *
 * @returns Object containing ownedTokens array and isFetching status
 */
export function useOwnedTokens() {
  const { activeAccount } = useAeSdk();

  const { data: ownedTokens = [], isFetching, error } = useQuery<OwnedTokenLike[]>({
    queryKey: [...OWNED_TOKENS_QUERY_KEY, activeAccount],
    queryFn: async (): Promise<OwnedTokenLike[]> => {
      if (!activeAccount) return [];

      const resp = (await AccountTokensService.listTokenHolders({
        address: activeAccount,
        orderBy: 'balance',
        orderDirection: 'DESC',
        limit: 1000,
        page: 1,
      })) as unknown as AccountTokensResponse;

      const items = Array.isArray(resp?.items) ? resp.items : [];
      return items.map(extractTokenLike).filter(Boolean) as OwnedTokenLike[];
    },
    enabled: !!activeAccount,
    // Treat the list as fresh for 30s so remounts/focus changes reuse the
    // cache instead of refetching. Trades invalidate OWNED_TOKENS_QUERY_KEY
    // for an immediate update, and a gentle 30s interval keeps it current
    // for changes that happen outside this client.
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

  return {
    ownedTokens,
    isFetching,
    error,
  };
}
