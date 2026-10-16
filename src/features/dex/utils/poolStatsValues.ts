import BigNumber from 'bignumber.js';
import type { PairDto } from '@/api/generated';
import { CONFIG } from '@/config';

export const poolNumber = (value: unknown) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
  const number = new BigNumber(value);
  return number.isFinite() ? number : null;
};

const reserveAmount = (raw: string, decimals: number) => {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    return null;
  }
  return new BigNumber(raw).shiftedBy(-decimals);
};

export function poolBalances(pair: PairDto) {
  const reserve0 = reserveAmount(pair.reserve0, pair.token0.decimals);
  const reserve1 = reserveAmount(pair.reserve1, pair.token1.decimals);
  const hasRatio = reserve0?.gt(0) && reserve1?.gt(0);
  return {
    reserve0,
    reserve1,
    // DEX pair contracts issue LP tokens with 18 decimals, independently of the assets.
    supply: reserveAmount(pair.total_supply, 18),
    rate0: hasRatio ? reserve1.div(reserve0) : null,
    rate1: hasRatio ? reserve0.div(reserve1) : null,
  };
}

export function formatPoolAmount(value: BigNumber | null) {
  if (!value) return '—';
  // Keep small nonzero amounts distinguishable from an empty balance.
  if (!value.isZero() && value.abs().lt(0.01)) return value.toPrecision(3);
  return value.toFormat(2);
}

export interface PairChainState {
  token0: string;
  token1: string;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
}

/**
 * Puts the on-chain reserves next to the right indexed token, matched by contract
 * address. The indexer can list the tokens in the opposite order of the pair
 * contract, which inverts every reserve-based value. `swapped` reports that case.
 * Returns null when the contract tokens do not match the indexed pair.
 */
export function alignPairWithChain(pair: PairDto, chain?: PairChainState | null) {
  if (!chain) return null;
  const { address: first } = pair.token0;
  const { address: second } = pair.token1;
  let swapped: boolean;
  if (chain.token0 === first && chain.token1 === second) swapped = false;
  else if (chain.token0 === second && chain.token1 === first) swapped = true;
  else return null;
  return {
    swapped,
    pair: {
      ...pair,
      reserve0: (swapped ? chain.reserve1 : chain.reserve0).toString(),
      reserve1: (swapped ? chain.reserve0 : chain.reserve1).toString(),
      total_supply: chain.totalSupply.toString(),
    },
  };
}

const isAe = (token: PairDto['token0']) => token.is_ae || token.address === CONFIG.DEX_WAE;

/** Pool value in AE: twice the AE side. Unknown for pools without an AE side. */
export function poolValueAe(pair: PairDto) {
  const { reserve0, reserve1 } = poolBalances(pair);
  if (isAe(pair.token0)) return reserve0 ? reserve0.times(2) : null;
  if (isAe(pair.token1)) return reserve1 ? reserve1.times(2) : null;
  return null;
}
