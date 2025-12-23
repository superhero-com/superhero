import { useQuery } from "@tanstack/react-query";
import { useAeSdk } from "./useAeSdk";
import { AccountTokensService } from "@/api/generated";

type AccountTokensResponse = {
  items?: unknown[];
  meta?: unknown;
};

export type OwnedTokenLike = Record<string, any>;

function extractTokenLike(item: unknown): OwnedTokenLike | null {
  if (!item || typeof item !== "object") return null;

  // Matches how other parts of the app treat the account tokens response.
  // Usually it's `{ token, balance, ... }`, but some environments may return
  // "flattened" fields like `token_name` / `token_symbol`.
  const asAny = item as any;
  if (asAny?.token && typeof asAny.token === "object") return asAny.token;

  // Fallback: if the API returns token-like fields on the item itself.
  const maybeTokenLike =
    asAny?.token_address ||
    asAny?.token_name ||
    asAny?.token_symbol ||
    asAny?.sale_address ||
    asAny?.address;
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
    queryKey: ["AccountTokensService.listTokenHolders", "ownedTokens", activeAccount],
    queryFn: async (): Promise<OwnedTokenLike[]> => {
      if (!activeAccount) return [];

      const resp = (await AccountTokensService.listTokenHolders({
        address: activeAccount,
        orderBy: "balance",
        orderDirection: "DESC",
        limit: 1000,
        page: 1,
      })) as unknown as AccountTokensResponse;

      const items = Array.isArray(resp?.items) ? resp.items : [];
      return items.map(extractTokenLike).filter(Boolean) as OwnedTokenLike[];
    },
    enabled: !!activeAccount,
    // While this hook is mounted/used, refetch every 8s. React Query will
    // automatically stop interval refetching once the hook is unmounted.
    refetchInterval: 8_000,
    refetchIntervalInBackground: false,
    staleTime: 0,
  });

  return {
    ownedTokens,
    isFetching,
    error,
  };
}
