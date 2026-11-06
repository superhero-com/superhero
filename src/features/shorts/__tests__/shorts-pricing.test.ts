import { describe, expect, it } from 'vitest';
import { shortsPricing, type ShortsPricing } from '../shorts-pricing';

const base: ShortsPricing = {
  network: 'ae_uat', likeFeeAetto: '0', treasuryBps: 2000,
};

describe('Free Like presentation', () => {
  it.each(['ae_uat', 'ae_mainnet'] as const)('shows a free Like on %s', (network) => {
    expect(shortsPricing({ ...base, network })).toMatchObject({
      unit: network === 'ae_uat' ? 'test AE' : 'AE',
      networkLabel: network === 'ae_uat' ? 'Testnet' : 'Mainnet',
      price: 'Free',
    });
  });

  it.each([0, 2000, 10000])('does not charge a Like regardless of retained treasury policy (%s bps)', (treasuryBps) => {
    expect(shortsPricing({ ...base, treasuryBps })).toMatchObject({
      price: 'Free',
      creatorReward: '0 test AE',
      treasuryReward: '0 test AE',
      roundingRemainder: false,
    });
  });

  it('rejects positive Like fees instead of displaying or defaulting to a paid offer', () => {
    ['1', '100000000000000000', '1234567890123456789'].forEach((likeFeeAetto) => {
      expect(shortsPricing({ ...base, likeFeeAetto })).toBeUndefined();
    });
  });

  it('never substitutes an available offer for missing or malformed release values', () => {
    expect(shortsPricing()).toBeUndefined();
    const invalid = [
      { likeFeeAetto: '-1' }, { likeFeeAetto: '00' }, { likeFeeAetto: '01' },
      { likeFeeAetto: '0.0' }, { likeFeeAetto: '0.1' }, { likeFeeAetto: '1e18' },
      { likeFeeAetto: 0 }, { likeFeeAetto: null }, { likeFeeAetto: undefined },
      { likeFeeAetto: (2n ** 256n).toString() }, { network: 'other' },
      { treasuryBps: -1 }, { treasuryBps: 10001 }, { treasuryBps: 20.1 },
      { treasuryBps: '2000' }, { treasuryBps: NaN },
    ];
    invalid.forEach((patch) => {
      expect(shortsPricing({ ...base, ...patch } as ShortsPricing)).toBeUndefined();
    });
  });
});
