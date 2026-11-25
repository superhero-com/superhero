import type { ShortsRelease } from './shorts-release';

export type ShortsPricing = Pick<ShortsRelease, 'likeFeeAetto' | 'treasuryBps' | 'network'>;

export const shortsAe = (value: string | bigint) => {
  const n = BigInt(value);
  const fraction = (n % (10n ** 18n)).toString().padStart(18, '0').replace(/0+$/, '');
  return `${n / (10n ** 18n)}${fraction ? `.${fraction}` : ''}`;
};
export const shortsUnit = (network?: string) => (network === 'ae_uat' ? 'test AE' : 'AE');

/** Presentation only: callers pass the independently verified payment release. */
export function freeLikeNetworkLabel(value?: ShortsPricing) {
  if (!value || !['ae_uat', 'ae_mainnet'].includes(value.network)
    || value.likeFeeAetto !== '0'
    || !Number.isInteger(value.treasuryBps) || value.treasuryBps < 0 || value.treasuryBps > 10000) return undefined;
  return value.network === 'ae_uat' ? 'Testnet' : 'Mainnet';
}
