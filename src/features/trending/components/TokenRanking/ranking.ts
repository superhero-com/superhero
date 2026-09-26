import BigNumber from 'bignumber.js';
import type { TokenDto } from '@/api/generated/models/TokenDto';

export type RankingToken = Partial<TokenDto>;

const amount = (value: unknown): BigNumber | null => {
  if ((typeof value !== 'string' && typeof value !== 'number')
    || !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(String(value).trim())) return null;
  const parsed = new BigNumber(value);
  return parsed.isFinite() && parsed.gte(0) ? parsed : null;
};

// Price is already AE per token; market cap is stored in aettos.
export const marketCap = (token: RankingToken) => (
  amount(token.market_cap_data?.ae ?? token.market_cap)?.shiftedBy(-18) ?? null
);
export const tokenPrice = (token: RankingToken) => amount(token.price_data?.ae ?? token.price);
export const holderCount = (token: RankingToken) => {
  const count = amount(token.holders_count);
  return count?.isInteger() ? count : null;
};
export const totalSupply = (token: RankingToken) => {
  const decimals = token.decimals == null || token.decimals === '' ? 18 : Number(token.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) return null;
  return amount(token.total_supply)?.shiftedBy(-decimals) ?? null;
};

export const formatAmount = (value: BigNumber | null, compact = false): string => {
  if (value == null) return '—';
  if (value.isZero()) return '0';
  if (value.lt(1)) return value.precision(4).toFormat();
  const magnitudes = ['', 'K', 'M', 'B', 'T'];
  const magnitude = compact ? Math.min(Math.floor((value.e ?? 0) / 3), 4) : 0;
  return `${value.shiftedBy(-3 * magnitude).decimalPlaces(2).toFormat()}${magnitudes[magnitude]}`;
};

export function rankingContext(items: RankingToken[], saleAddress?: string) {
  const rows = items.filter((item) => item.sale_address && item.name
    && Number.isInteger(item.rank) && item.rank! > 0 && item.rank! < 2147483647)
    .sort((a, b) => a.rank! - b.rank!);
  const currentIndex = rows.findIndex((item) => item.sale_address === saleAddress);
  const current = rows[currentIndex];
  const leading = current?.rank === 1;
  const neighbor = leading ? rows[currentIndex + 1] : rows[currentIndex - 1];
  const currentCap = current ? marketCap(current) : null;
  const neighborCap = neighbor ? marketCap(neighbor) : null;
  let difference: BigNumber | null = null;
  if (currentCap != null && neighborCap != null) {
    difference = leading ? currentCap.minus(neighborCap) : neighborCap.minus(currentCap);
  }
  // A delayed ranking refresh can disagree with live caps. Do not label a negative gap as a lead.
  const gap = difference?.gte(0) ? difference : null;
  return {
    rows, current, neighbor, leading, gap,
  };
}
