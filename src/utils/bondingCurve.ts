import BigNumber from 'bignumber.js';

// The sale's pricing, from bctsl-contracts: BondingCurveExponential.aes charges the area
// under f(x) = A·e^(K·x) − (A − INITIAL_PRICE) AE per token (x = supply in tokens) and pays
// back SELL_RETURN_SHARE of it on a sell; AffiliationBondingCurveTokenSale.aes adds the
// treasury's 500 / 1e5 fee on top of every buy.
const A = 0.001;
const K = 0.00000001;
const INITIAL_PRICE = 0.0000001;
const SELL_RETURN_SHARE = 0.995;
const AFFILIATION_FEE = 0.005;
const DECIMALS = new BigNumber(10).pow(18); // 1e18

export function toDecimals(amount: number | string, decimals: number | string = 18): BigNumber {
  return new BigNumber(amount).multipliedBy(new BigNumber(10).pow(Number(decimals) || 18));
}

export function toAe(aettos: BigNumber | string | number): number {
  const n = BigNumber.isBigNumber(aettos) ? (aettos as BigNumber) : new BigNumber(aettos);
  return Number(n.dividedBy(DECIMALS).toFixed(18));
}

const toTokens = (aettos: BigNumber) => aettos.div(DECIMALS).toNumber();

// The area in closed form (expm1 keeps small counts precise), in AE.
function curveArea(fromTokens: number, countTokens: number): number {
  return A * ((Math.exp(K * fromTokens) * Math.expm1(K * countTokens)) / K - countTokens)
    + INITIAL_PRICE * countTokens;
}

const buyCost = (supplyTokens: number, countTokens: number) => (
  curveArea(supplyTokens, countTokens) * (1 + AFFILIATION_FEE)
);
const sellReturn = (remainingTokens: number, countTokens: number) => (
  curveArea(remainingTokens, countTokens) * SELL_RETURN_SHARE
);

// The token count whose AE amount, as `amountOf` grows with the count, is `aeAmount`;
// bisected down to adjacent doubles. `side` picks which end of the final bracket to return.
function invert(
  amountOf: (countTokens: number) => number,
  aeAmount: number,
  maxTokens: number,
  side: 'atMost' | 'atLeast',
): number {
  if (!(aeAmount > 0) || !(maxTokens > 0)) return 0;
  let high = Math.min(1, maxTokens);
  while (high < maxTokens && amountOf(high) < aeAmount) high = Math.min(high * 2, maxTokens);
  if (amountOf(high) < aeAmount) return maxTokens;
  let low = 0;
  for (let i = 0; i < 2000; i += 1) {
    const mid = (low + high) / 2;
    if (mid <= low || mid >= high) break;
    if (amountOf(mid) < aeAmount) low = mid; else high = mid;
  }
  return side === 'atMost' ? low : high;
}

export function calculateBuyPrice(supplyAettos: BigNumber, countAettos: BigNumber): BigNumber {
  return toDecimals(curveArea(toTokens(supplyAettos), toTokens(countAettos)));
}

export function calculateBuyPriceWithAffiliationFee(
  supplyAettos: BigNumber,
  countAettos: BigNumber,
): BigNumber {
  return toDecimals(buyCost(toTokens(supplyAettos), toTokens(countAettos)));
}

export function calculateSellReturn(supplyAettos: BigNumber, countAettos: BigNumber): BigNumber {
  const remaining = toTokens(supplyAettos.minus(countAettos));
  return toDecimals(sellReturn(remaining, toTokens(countAettos)));
}

/** Tokens (not aettos) that `aeAmount` AE buys, fee included, without costing more. */
export function calculateBuyTokensFromAE(supplyAettos: BigNumber, aeAmount: number): BigNumber {
  const supply = toTokens(supplyAettos);
  return new BigNumber(invert((count) => buyCost(supply, count), aeAmount, Infinity, 'atMost'));
}

/**
 * Tokens (not aettos) to sell for at least `aeAmount` AE. When the whole supply returns
 * less, that is the whole supply: no sell can reach the amount.
 */
export function calculateSellTokensFromAE(supplyAettos: BigNumber, aeAmount: number): BigNumber {
  const supply = toTokens(supplyAettos);
  return new BigNumber(
    invert((count) => sellReturn(supply - count, count), aeAmount, supply, 'atLeast'),
  );
}
