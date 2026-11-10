/**
 * The token sale's on-chain pricing, ported line for line from bctsl-contracts, in the
 * contract's own integer arithmetic. Tests use it as the oracle for what a trade really
 * costs or pays, so it is checked against that repo's on-chain vectors (CONTRACT_VECTORS)
 * before anything else relies on it.
 *
 * - BondingCurveExponential.aes: calculate_price, calculate_sell_return, mc2, exp_helper
 * - AffiliationBondingCurveTokenSale.aes: price (curve price plus the affiliation fee)
 * - AffiliationTreasury.aes: get_affiliation_fee_percentage (500) / precision (1e5)
 *
 * All amounts are in aettos (1e-18 of an AE or of a token).
 */

const A = 10n ** 15n;
const K = 10n ** 10n;
const INITIAL_PRICE = 10n ** 11n;
const DECIMALS = 10n ** 18n;
const SELL_RETURN_PERCENTAGE = 9950n;
const SELL_RETURN_PRECISION = 10000n;
const AFFILIATION_FEE_PERCENTAGE = 500n;
const AFFILIATION_FEE_PRECISION = 10n ** 5n;

const MINIMUM_COUNT = 10n ** 12n;

function expHelper(x: bigint, term0: bigint, sum0: bigint, i0: bigint, scale: bigint): bigint {
  let term = term0;
  let sum = sum0;
  for (let i = i0; i <= 100n && term >= 1n; i += 1n) {
    term = (term * x) / (i * scale);
    sum += term;
  }
  return sum;
}

const mc2 = (x: bigint) => expHelper(x, x, 0n, 2n, DECIMALS * DECIMALS);

export function curvePrice(totalSupply: bigint, count: bigint): bigint {
  if (count < MINIMUM_COUNT) throw new Error('MINIMUM_TOKENS_REQUIRED');
  return (INITIAL_PRICE * count) / DECIMALS
    + (A * (mc2(K * (totalSupply + count)) - mc2(K * totalSupply))) / (K * DECIMALS);
}

/** What `sell_return(count)` pays out at `totalSupply`. */
export function sellReturn(totalSupply: bigint, count: bigint): bigint {
  return (curvePrice(totalSupply - count, count) * SELL_RETURN_PERCENTAGE) / SELL_RETURN_PRECISION;
}

/** What `price(count)` charges at `totalSupply`: the curve price plus the affiliation fee. */
export function buyPrice(totalSupply: bigint, count: bigint): bigint {
  const price = curvePrice(totalSupply, count);
  return price + (price * AFFILIATION_FEE_PERCENTAGE) / AFFILIATION_FEE_PRECISION;
}

/**
 * bctsl-contracts test/bondingCurveExponentialTest.js `testCases`, which that suite checks
 * against the deployed contract: calculate_buy_price(supply, amount) === price and
 * calculate_sell_return(supply + amount, amount) === sellReturn.
 */
export const CONTRACT_VECTORS: ReadonlyArray<{
  supply: bigint; amount: bigint; price: bigint; sellReturn: bigint;
}> = [
  {
    supply: 0n, amount: 10n ** 12n, price: 100000n, sellReturn: 99500n,
  },
  {
    supply: 0n, amount: 10n ** 16n, price: 1000000500n, sellReturn: 995000497n,
  },
  {
    supply: 0n, amount: 141358902342371412n, price: 14135990145n, sellReturn: 14065310194n,
  },
  {
    supply: 10n ** 18n, amount: 10n ** 16n, price: 1000100500n, sellReturn: 995099997n,
  },
  {
    supply: 10n ** 26n, amount: 10n ** 16n, price: 17183818285949n, sellReturn: 17097899194519n,
  },
  {
    supply: 0n, amount: 10n ** 18n, price: 100005000000n, sellReturn: 99504975000n,
  },
  {
    supply: 10n ** 18n, amount: 10n ** 18n, price: 100015000000n, sellReturn: 99514925000n,
  },
  {
    supply: 10n ** 26n, amount: 10n ** 18n, price: 1718381842050454n, sellReturn: 1709789932840201n,
  },
  {
    supply: 0n,
    amount: 10n ** 25n,
    price: 518091807564762481170n,
    sellReturn: 515501348526938668764n,
  },
];
