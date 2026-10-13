import { DexTokenDto } from '../../../api/generated';

const CONTRACT_ADDRESS_RE = /^ct_[1-9A-HJ-NP-Za-km-z]{38,60}$/;

export function isContractAddress(value: string): boolean {
  return CONTRACT_ADDRESS_RE.test(value.trim());
}

/** A token counts as actively traded once it has any recorded DEX volume. */
export function isActivelyTraded(token: DexTokenDto): boolean {
  if (token.is_ae || token.listed) return true;
  const { summary } = token;
  if (!summary) return false;
  const volumes = [
    summary.total_volume?.ae,
    ...Object.values(summary.change ?? {}).map((change) => (change as any)?.volume?.ae),
  ];
  return volumes.some((volume) => Number(volume) > 0);
}

/** Merge token lists, keeping the first occurrence of every address. */
export function mergeTokens(...lists: DexTokenDto[][]): DexTokenDto[] {
  const seen = new Set<string>();
  const out: DexTokenDto[] = [];
  lists.flat().forEach((token) => {
    if (!token?.address || seen.has(token.address)) return;
    seen.add(token.address);
    out.push(token);
  });
  return out;
}

export interface MiddlewareAex9Token {
  contract_id: string;
  name: string;
  symbol: string;
  decimals: number;
  invalid?: boolean;
}

export function tokenFromMiddleware(token: MiddlewareAex9Token): DexTokenDto | null {
  if (!token?.contract_id || token.invalid || !token.symbol) return null;
  return {
    address: token.contract_id,
    name: token.name || token.symbol,
    symbol: token.symbol,
    decimals: Number.isFinite(Number(token.decimals)) ? Number(token.decimals) : 18,
    pairs_count: 0,
    created_at: new Date(0).toISOString(),
    is_ae: false,
    listed: false,
    price: undefined as unknown as DexTokenDto['price'],
    summary: null,
  };
}
