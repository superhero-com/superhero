import BigNumber from 'bignumber.js';

export function shiftDecimalPlaces(amount: string | number, decimals: number) {
  return new BigNumber(amount || 0).shiftedBy(decimals);
}

export function formatTokenAmount(
  amount: string | number,
  decimals: number = 18,
  round: number = 2,
) {
  return shiftDecimalPlaces(amount, -decimals).toFixed(round);
}


