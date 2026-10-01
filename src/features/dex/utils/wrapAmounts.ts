import BigNumber from 'bignumber.js';

// A conservative shortcut reserve, not a fee quote. Users can edit the amount;
// the wallet shows and validates the actual contract-call fee before signing.
export const WRAP_MAX_FEE_RESERVE_AE = '0.3';

export function wrapAmounts(
  input: string,
  balance: string | undefined,
  aeBalance: string | undefined,
  wrap: boolean,
) {
  const available = new BigNumber(balance ?? NaN);
  const native = new BigNumber(aeBalance ?? NaN);
  const amount = new BigNumber(/^\d+(?:\.\d{0,18})?$/.test(input) ? input : NaN);
  const valid = amount.isFinite() && amount.gt(0);
  const known = available.isFinite() && available.gte(0);
  const exceeds = valid && known && amount.gt(available);
  const withinBalance = valid && known && !exceeds;
  const hasFeeFunds = native.isFinite() && native.gt(0) && (!wrap || !valid || amount.lt(native));
  const max = known
    ? BigNumber.max(0, available.minus(wrap ? WRAP_MAX_FEE_RESERVE_AE : 0)) : new BigNumber(0);
  return {
    valid,
    known,
    exceeds,
    hasFeeFunds,
    ready: withinBalance && hasFeeFunds,
    amount: valid ? amount.toFixed() : undefined,
    output: valid ? amount.toFormat() : '0.00',
    remaining: withinBalance ? available.minus(amount).toFormat() : undefined,
    balance: known ? available.toFormat() : '—',
    half: known ? available.div(2).decimalPlaces(18, BigNumber.ROUND_DOWN).toFixed() : '0',
    max: max.decimalPlaces(18, BigNumber.ROUND_DOWN).toFixed(),
  };
}
