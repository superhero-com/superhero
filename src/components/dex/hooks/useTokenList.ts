import { useEffect, useState } from 'react';
import { DEX_ADDRESSES } from '../../../libs/dex';
import { Token, TokenListState } from '../types/dex';

export function useTokenList(): TokenListState {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    
    async function load() {
      setLoading(true);
      try {
        // eslint-disable-next-line no-console
        console.info('[dex] Loading token list…');
        const { getListedTokens } = await import('../../../libs/dexBackend');
        const resp = await getListedTokens();
        // eslint-disable-next-line no-console
        console.info('[dex] Token list fetched from backend', { count: (resp || []).length });
        
        // Build and de-duplicate by contractId to avoid duplicate React keys
        const raw: Token[] = [
          { contractId: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { contractId: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
          ...(resp || []).map((t: any) => ({
            contractId: t.address,
            symbol: t.symbol || t.name || 'TKN',
            decimals: Number(t.decimals || 18),
          })),
        ];
        
        const uniqueByAddress = new Map<string, Token>();
        for (const token of raw) {
          if (!token?.contractId) continue;
          if (!uniqueByAddress.has(token.contractId)) uniqueByAddress.set(token.contractId, token);
        }
        
        const tokens = Array.from(uniqueByAddress.values());
        const removed = raw.length - tokens.length;
        if (removed > 0) {
          // eslint-disable-next-line no-console
          console.info('[dex] Deduplicated token list by contractId', { removed, finalCount: tokens.length });
        }
        
        if (!ignore) setTokens(tokens);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[dex] Failed to load tokens, using defaults', e);
        if (!ignore) setTokens([
          { contractId: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { contractId: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
        ]);
      } finally {
        if (!ignore) setLoading(false);
        // eslint-disable-next-line no-console
        console.info('[dex] Token list load finished');
      }
    }
    
    load();
    return () => { ignore = true; };
  }, []);

  return { tokens, loading };
}
