import type { ShortsRelease } from './shorts-release';

export type ShortsPricing = Pick<ShortsRelease, 'likeFeeAetto' | 'treasuryBps' | 'network'>;

export const shortsAe = (value: string | bigint) => {
  const n = BigInt(value);
  const fraction = (n % (10n ** 18n)).toString().padStart(18, '0').replace(/0+$/, '');
  return `${n / (10n ** 18n)}${fraction ? `.${fraction}` : ''}`;
};
export const shortsUnit = (network?: string) => (network === 'ae_uat' ? 'test AE' : 'AE');

/** Presentation only: callers pass the independently verified payment release. */
export function shortsPricing(value?: ShortsPricing) {
  if (!value || !['ae_uat', 'ae_mainnet'].includes(value.network)
    || value.likeFeeAetto !== '0'
    || BigInt(value.likeFeeAetto) >= 2n ** 256n || !Number.isInteger(value.treasuryBps)
    || value.treasuryBps < 0 || value.treasuryBps > 10000) return undefined;
  const fee = BigInt(value.likeFeeAetto);
  const treasury = (fee * BigInt(value.treasuryBps)) / 10000n;
  const unit = shortsUnit(value.network);
  return {
    unit,
    networkLabel: value.network === 'ae_uat' ? 'Testnet' : 'Mainnet',
    price: 'Free',
    creatorReward: `${shortsAe(fee - treasury)} ${unit}`,
    treasuryReward: `${shortsAe(treasury)} ${unit}`,
    creatorPercent: (10000 - value.treasuryBps) / 100,
    treasuryPercent: value.treasuryBps / 100,
    roundingRemainder: (fee * BigInt(value.treasuryBps)) % 10000n !== 0n,
  };
}
