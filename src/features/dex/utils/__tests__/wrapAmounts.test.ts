import { describe, expect, it } from 'vitest';
import { wrapAmounts } from '../wrapAmounts';

describe('wrap amount calculations', () => {
  it('keeps all 18 decimals without rounding an output or exceeding the available balance', () => {
    const result = wrapAmounts('1.123456789012345678', '2.000000000000000003', '1', false);
    expect(result.output).toBe('1.123456789012345678');
    expect(result.remaining).toBe('0.876543210987654325');
    expect(result.half).toBe('1.000000000000000001');
    expect(result.max).toBe('2.000000000000000003');
    expect(result.ready).toBe(true);
    expect(wrapAmounts('2.000000000000000004', '2.000000000000000003', '1', false).ready).toBe(false);
  });
  it('leaves a reserve for wrap Max and rejects invalid amounts and missing fee funds', () => {
    expect(wrapAmounts('', '1.000000000000000001', '1.000000000000000001', true).max).toBe('0.700000000000000001');
    expect(wrapAmounts('', '0.2', '0.2', true).max).toBe('0');
    ['', '0', '-1', 'NaN', 'Infinity', '1e3', '0.0000000000000000001'].forEach((value) => {
      expect(wrapAmounts(value, '1', '1', true).ready).toBe(false);
    });
    expect(wrapAmounts('1', '1', '1', true).hasFeeFunds).toBe(false);
    expect(wrapAmounts('1', '1', '0', false).hasFeeFunds).toBe(false);
    expect(wrapAmounts('1', undefined, undefined, true).ready).toBe(false);
  });
});
