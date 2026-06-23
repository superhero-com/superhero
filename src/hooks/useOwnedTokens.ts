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
 * @param options.search Optional term passed to the endpoint to narrow the
 *   result server-side. Callers that only need to know whether the user holds
 *   a specific token (rather than render the full list) should pass the token's
 *   name/symbol so we fetch a handful of matching rows instead of the whole
 *   portfolio. The endpoint caps `limit` at 100, so an unfiltered fetch only
 *   ever returns the top holdings by balance.
 * @returns Object containing ownedTokens array and isFetching status
 */
export function useOwnedTokens(options: { search?: string } = {}) {
  const { search } = options;
  const { activeAccount } = useAeSdk();

  const { data: ownedTokens = [], isFetching, error } = useQuery<OwnedTokenLike[]>({
    queryKey: [...OWNED_TOKENS_QUERY_KEY, activeAccount, search ?? null],
    queryFn: async (): Promise<OwnedTokenLike[]> => {
      if (!activeAccount) return [];

      const resp = (await AccountTokensService.listTokenHolders({
        address: activeAccount,
        orderBy: 'balance',
        orderDirection: 'DESC',
        // The endpoint caps `limit` at 100. A `search` term narrows the result
        // to the matching token(s) server-side, so portfolio size no longer
        // affects whether the target token shows up. We still request the full
        // page so that even a loose/substring `search` match against many
        // similarly-named holdings can't push the target off the first page.
        limit: 100,
        page: 1,
        search: search || undefined,
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
