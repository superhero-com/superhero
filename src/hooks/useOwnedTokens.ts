import { useQuery } from "@tanstack/react-query";
import { useAeSdk } from "./useAeSdk";
import { TokenDto, TokensService } from "@/api/generated";

// Define the API response structure for tokens
interface TokensResponse {
  items: TokenDto[];
  meta?: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

/**
 * React hook for fetching tokens owned or created by the current user
 * 
 * This hook is equivalent to the Vue composable useOwnedTokens.
 * It fetches tokens where the current user is either the owner or creator.
 * 
 * @returns Object containing ownedTokens array and isFetching status
 */
export function useOwnedTokens() {
  const { activeAccount } = useAeSdk();

  const { data, isFetching, error } = useQuery<TokensResponse>({
    queryKey: ["TokensService.ownedTokens", activeAccount],
    queryFn: async (): Promise<TokensResponse> => {
      if (!activeAccount) {
        return { items: [] };
      }

      try {
        const response = await TokensService.listAll({
          ownerAddress: activeAccount,
          creatorAddress: activeAccount,
          limit: 1000,
        });

        // Handle the case where the API returns any type
        // The API response should have an 'items' property with TokenDto array
        if (response && typeof response === 'object' && 'items' in response) {
          return response as TokensResponse;
        }

        // Fallback: if response is directly an array (legacy API format)
        if (Array.isArray(response)) {
          return { items: response };
        }

        // Fallback: empty result
        return { items: [] };
      } catch (error) {
        console.error('Failed to fetch owned tokens:', error);
        throw error;
      }
    },
    enabled: !!activeAccount,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab (tokens may have been created/transferred)
  });

  // Extract the tokens array from the response
  const ownedTokens = data?.items ?? [];

  return {
    ownedTokens,
    isFetching,
    error,
  };
}
