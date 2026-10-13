import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { DexService, DexTokenDto } from '../../../api/generated';
import { customDexTokensAtom } from '../../../atoms/dexAtoms';
import { CONFIG } from '../../../config';
import { MiddlewareAex9Token, tokenFromMiddleware } from '../utils/tokenList';

/** Look up token metadata from the DEX API, falling back to the middleware for any AEX9 token. */
export async function resolveTokenByAddress(address: string): Promise<DexTokenDto | null> {
  const trimmed = address.trim();
  try {
    const token = await DexService.getDexTokenByAddress({ address: trimmed });
    if (token?.address) return token;
  } catch {
    // not known to the DEX, try the middleware
  }
  try {
    const response = await fetch(`${CONFIG.MIDDLEWARE_URL}/v3/aex9/${trimmed}`);
    if (!response.ok) return null;
    return tokenFromMiddleware(await response.json() as MiddlewareAex9Token);
  } catch {
    return null;
  }
}

export function useCustomTokens() {
  const [customTokens, setCustomTokens] = useAtom(customDexTokensAtom);

  const addCustomToken = useCallback((token: DexTokenDto) => {
    if (!token?.address || token.is_ae) return;
    // Only keep static metadata; prices and volume go stale in storage.
    const stored = {
      address: token.address,
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      pairs_count: token.pairs_count ?? 0,
      created_at: token.created_at,
      is_ae: false,
      listed: !!token.listed,
      summary: null,
    } as unknown as DexTokenDto;
    setCustomTokens((prev) => [
      ...(prev as DexTokenDto[] ?? []).filter((item) => item.address !== token.address),
      stored,
    ]);
  }, [setCustomTokens]);

  const removeCustomToken = useCallback((address: string) => {
    setCustomTokens((prev) => (prev as DexTokenDto[] ?? []).filter((item) => item.address !== address));
  }, [setCustomTokens]);

  return {
    customTokens: (customTokens as DexTokenDto[]) ?? [], addCustomToken, removeCustomToken,
  };
}
