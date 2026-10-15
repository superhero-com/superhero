import { describe, expect, it } from 'vitest';
import { shortsPricing, type ShortsPricing } from '../shorts-pricing';

const base: ShortsPricing = {
  network: 'ae_uat', likeFeeAetto: '100000000000000000', treasuryBps: 2000,
};

describe('Release pricing presentation', () => {
  it.each(['ae_uat', 'ae_mainnet'] as const)('formats exact rewards on %s', (network) => {
    const unit = network === 'ae_uat' ? 'test AE' : 'AE';
    expect(shortsPricing({ ...base, network })).toEqual({
      unit,
      networkLabel: network === 'ae_uat' ? 'Testnet' : 'Mainnet',
      price: `0.1 ${unit}`,
      creatorReward: `0.08 ${unit}`,
      treasuryReward: `0.02 ${unit}`,
      creatorPercent: 80,
      treasuryPercent: 20,
      roundingRemainder: false,
    });
  });

  it('keeps all 18 decimal places and assigns the integer rounding remainder to the creator', () => {
    expect(shortsPricing({ ...base, likeFeeAetto: '1234567890123456789', treasuryBps: 3333 }))
      .toMatchObject({
        price: '1.234567890123456789 test AE',
        creatorReward: '0.823086412345308642 test AE',
        treasuryReward: '0.411481477778148147 test AE',
        creatorPercent: 66.67,
        treasuryPercent: 33.33,
        roundingRemainder: true,
      });
    expect(shortsPricing({ ...base, likeFeeAetto: '1' })).toMatchObject({
      creatorReward: '0.000000000000000001 test AE', treasuryReward: '0 test AE',
    });
  });

  it.each([0, 10000])('allows a release with %s treasury basis points', (treasuryBps) => {
    expect(shortsPricing({ ...base, treasuryBps })).toMatchObject({
      creatorReward: `${treasuryBps ? '0' : '0.1'} test AE`,
      treasuryReward: `${treasuryBps ? '0.1' : '0'} test AE`,
      roundingRemainder: false,
    });
  });

  it('never substitutes default economics for unavailable or malformed values', () => {
    expect(shortsPricing()).toBeUndefined();
    const invalid = [
      { likeFeeAetto: '0' }, { likeFeeAetto: '-1' }, { likeFeeAetto: '01' },
      { likeFeeAetto: '0.1' }, { likeFeeAetto: '1e18' }, { likeFeeAetto: 1 },
      { likeFeeAetto: (2n ** 256n).toString() }, { network: 'other' },
      { treasuryBps: -1 }, { treasuryBps: 10001 }, { treasuryBps: 20.1 },
      { treasuryBps: '2000' }, { treasuryBps: NaN },
    ];
    invalid.forEach((patch) => {
      expect(shortsPricing({ ...base, ...patch } as ShortsPricing)).toBeUndefined();
    });
  });
});
