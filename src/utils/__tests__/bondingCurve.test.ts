import BigNumber from 'bignumber.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  CONTRACT_VECTORS, buyPrice, curvePrice, sellReturn,
} from '@/__tests__/helpers/bondingCurveContract';
import {
  calculateBuyPrice,
  calculateBuyPriceWithAffiliationFee,
  calculateBuyTokensFromAE,
  calculateSellReturn,
  calculateSellTokensFromAE,
} from '../bondingCurve';

const big = (aettos: bigint | BigNumber) => (
  BigNumber.isBigNumber(aettos) ? aettos : new BigNumber(aettos.toString())
);
/** Tokens or AE as a whole number of aettos. */
const toAettos = (amount: BigNumber | number) => BigInt(
  new BigNumber(amount).times(1e18).integerValue(BigNumber.ROUND_FLOOR).toFixed(),
);

// The contract rounds every division down, so it can sit a few aettos under the exact
// area; past that, client and contract must agree to the ninth significant digit.
function expectNear(actual: BigNumber | bigint, expected: BigNumber | bigint, relative = 1e-9) {
  const value = big(actual);
  const exact = big(expected);
  const allowed = BigNumber.max(exact.abs().times(relative), 4);
  expect(
    value.minus(exact).abs().lte(allowed),
    `${value.toFixed(0)} is not within ${allowed.toFixed(0)} of ${exact.toFixed(0)}`,
  ).toBe(true);
}

// Log-uniform by decade, so dust trades and whole-market ones come up equally often.
const aettosBetween = (fromExponent: number, toExponent: number) => fc
  .integer({ min: fromExponent, max: toExponent - 1 })
  .chain((e) => fc.bigInt({ min: 10n ** BigInt(e), max: 10n ** BigInt(e + 1) }));
const supplies = fc.oneof(fc.constant(0n), aettosBetween(18, 27)); // up to 1e9 tokens
const counts = aettosBetween(12, 26); // the contract's minimum count up to 1e8 tokens
const aeAmounts = fc
  .integer({ min: -3, max: 5 })
  .chain((e) => fc.double({ min: 10 ** e, max: 10 ** (e + 1), noNaN: true }));

describe('the contract model these tests trust', () => {
  it('reproduces every on-chain vector exactly', () => {
    const modelled = CONTRACT_VECTORS.map(({ supply, amount }) => ({
      price: curvePrice(supply, amount),
      sellReturn: sellReturn(supply + amount, amount),
    }));
    expect(modelled).toEqual(CONTRACT_VECTORS.map(({ price, sellReturn: paid }) => ({
      price, sellReturn: paid,
    })));
  });
});

describe('client quotes', () => {
  it('match the contract on its own vectors', () => {
    CONTRACT_VECTORS.forEach(({
      supply, amount, price, sellReturn: expectedReturn,
    }) => {
      expectNear(calculateBuyPrice(big(supply), big(amount)), price);
      expectNear(calculateSellReturn(big(supply + amount), big(amount)), expectedReturn);
    });
  });

  it('charge and pay what the contract would at any supply and amount', () => {
    fc.assert(fc.property(supplies, counts, (supply, count) => {
      const after = supply + count;
      expectNear(calculateBuyPrice(big(supply), big(count)), curvePrice(supply, count));
      expectNear(
        calculateBuyPriceWithAffiliationFee(big(supply), big(count)),
        buyPrice(supply, count),
      );
      expectNear(calculateSellReturn(big(after), big(count)), sellReturn(after, count));
    }));
  });
});

describe('the curve as a market', () => {
  it('charges the same for one buy as for the same tokens bought in two', () => {
    fc.assert(fc.property(supplies, counts, counts, (supply, first, second) => {
      const together = calculateBuyPrice(big(supply), big(first + second));
      const split = calculateBuyPrice(big(supply), big(first))
        .plus(calculateBuyPrice(big(supply + first), big(second)));
      expectNear(together, split);
    }));
  });

  it('never pays back what buying the same tokens cost', () => {
    fc.assert(fc.property(supplies, counts, (supply, count) => {
      const paid = calculateBuyPriceWithAffiliationFee(big(supply), big(count));
      const returned = calculateSellReturn(big(supply + count), big(count));
      expect(returned.lt(paid)).toBe(true);
    }));
  });

  it('prices the same tokens higher the more are already in circulation', () => {
    fc.assert(fc.property(supplies, aettosBetween(18, 26), counts, (supply, added, count) => {
      expect(calculateBuyPrice(big(supply + added), big(count))
        .gt(calculateBuyPrice(big(supply), big(count)))).toBe(true);
    }));
  });
});

describe('tokens for an AE amount', () => {
  it('buys as many tokens as the AE pays for, fee included', () => {
    fc.assert(fc.property(supplies, aeAmounts, (supply, ae) => {
      const tokens = calculateBuyTokensFromAE(big(supply), ae);
      expectNear(buyPrice(supply, toAettos(tokens)), toAettos(ae));
    }));
  });

  it('sells just enough tokens to receive the AE asked for', () => {
    const shares = fc.double({ min: 1e-4, max: 0.99, noNaN: true });
    fc.assert(fc.property(aettosBetween(21, 27), shares, (supply, share) => {
      const wanted = toAettos(big(sellReturn(supply, supply)).times(share).div(1e18));
      const tokens = calculateSellTokensFromAE(big(supply), big(wanted).div(1e18).toNumber());
      expect(toAettos(tokens) <= supply).toBe(true);
      expectNear(sellReturn(supply, toAettos(tokens)), wanted);
    }));
  });

  it('quotes the whole supply for more AE than selling all of it returns', () => {
    fc.assert(fc.property(aettosBetween(21, 27), (supply) => {
      const everything = Number(sellReturn(supply, supply)) / 1e18;
      const tokens = calculateSellTokensFromAE(big(supply), everything * 1.5);
      expect(tokens.toNumber()).toBe(big(supply).div(1e18).toNumber());
    }));
  });

  it('never gives fewer tokens for more AE', () => {
    const factors = fc.double({ min: 1.000001, max: 1000, noNaN: true });
    fc.assert(fc.property(aettosBetween(21, 27), aeAmounts, factors, (supply, less, factor) => {
      const more = less * factor;
      expect(calculateBuyTokensFromAE(big(supply), less)
        .lte(calculateBuyTokensFromAE(big(supply), more))).toBe(true);
      expect(calculateSellTokensFromAE(big(supply), less)
        .lte(calculateSellTokensFromAE(big(supply), more))).toBe(true);
    }));
  });

  it('is zero for no amount, and for selling when nothing is in circulation', () => {
    [0, -1, Number.NaN].forEach((ae) => {
      expect(calculateBuyTokensFromAE(big(10n ** 24n), ae).toNumber()).toBe(0);
      expect(calculateSellTokensFromAE(big(10n ** 24n), ae).toNumber()).toBe(0);
    });
    expect(calculateSellTokensFromAE(big(0n), 1).toNumber()).toBe(0);
  });
});
