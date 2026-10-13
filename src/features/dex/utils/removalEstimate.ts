import BigNumber from 'bignumber.js';
import { subSlippage } from '../../../libs/dex';

export function removalAmount(balance: string, percentage: number, custom?: string) {
  const available = /^\d+$/.test(balance) ? new BigNumber(balance) : new BigNumber(NaN);
  const input = custom === undefined ? available.times(percentage).div(100) : new BigNumber(custom || NaN).shiftedBy(18);
  const raw = custom === undefined ? input.integerValue(BigNumber.ROUND_DOWN) : input;
  const valid = available.isFinite() && available.gt(0) && raw.isFinite()
    && raw.isInteger() && raw.gt(0) && raw.lte(available);
  return {
    valid,
    exceeds: raw.isFinite() && raw.gt(available),
    raw: valid ? raw.toFixed(0) : undefined,
    amount: valid ? raw.shiftedBy(-18).toFixed() : undefined,
    remaining: valid ? available.minus(raw).shiftedBy(-18).toFixed() : undefined,
    percentage: valid ? raw.times(100).div(available).toFixed() : undefined,
    full: valid && raw.eq(available),
    balance: available.isFinite() ? available.shiftedBy(-18).toFixed() : undefined,
  };
}

type PoolReserves = { reserveA: bigint; reserveB: bigint; totalSupply: bigint | null };
export function removalEstimate(raw: string | undefined, pool: PoolReserves | null | undefined, decimals: [number, number], slippage: number) {
  if (!raw || !pool?.totalSupply || pool.totalSupply <= 0n || !/^\d+$/.test(raw)
    || !Number.isFinite(slippage) || slippage < 0 || slippage > 50
    || decimals.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) return null;
  const amount = BigInt(raw);
  if (amount <= 0n || amount > pool.totalSupply || pool.reserveA <= 0n || pool.reserveB <= 0n) return null;
  const values = [pool.reserveA, pool.reserveB].map((reserve, index) => {
    const expected = (amount * reserve) / pool.totalSupply!;
    const minimum = subSlippage(expected, slippage);
    return {
      amount: new BigNumber(expected.toString()).shiftedBy(-decimals[index]).toFixed(),
      minimum: new BigNumber((minimum > 0n ? minimum : 1n).toString()).shiftedBy(-decimals[index]).toFixed(),
      positive: expected > 0n,
    };
  });
  return values.every((value) => value.positive) ? values : null;
}

/**
 * LP amount to burn. A full removal always burns the balance read from the pair right
 * before the transaction: the position balance comes from the indexer and can lag
 * behind the chain, which would leave dust LP tokens behind.
 */
export function liquidityToBurn(requested: bigint, full: boolean, onChainBalance: bigint) {
  // Worded to map to the "not enough balance" user message in errorToUserMessage.
  if (onChainBalance <= 0n || (!full && requested > onChainBalance)) {
    throw new Error('Insufficient balance of LP tokens');
  }
  return full ? onChainBalance : requested;
}
