import { describe, it, expect } from 'vitest';
import { formatTokenAmount, shiftDecimalPlaces } from '../../utils/number';

describe('number utils', () => {
  it('shiftDecimalPlaces works', () => {
    expect(shiftDecimalPlaces(1000, -3).toFixed()).toBe('1');
    expect(shiftDecimalPlaces('1', 18).toFixed()).toBe('1000000000000000000');
  });
  it('formatTokenAmount formats with decimals and rounding', () => {
    expect(formatTokenAmount('1000000000000000000', 18, 2)).toBe('1.00');
    expect(formatTokenAmount('1500', 3, 3)).toBe('1.500');
  });
});


