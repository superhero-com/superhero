import { describe, expect, it } from 'vitest';
import { slippageLevel } from '../slippage';

describe('slippageLevel', () => {
  it('flags slippage above 5% as high', () => {
    expect(slippageLevel(5.1)).toBe('high');
    expect(slippageLevel('20')).toBe('high');
  });

  it('flags very low slippage', () => {
    expect(slippageLevel(0)).toBe('low');
    expect(slippageLevel('0.05')).toBe('low');
  });

  it('accepts normal values and ignores empty or invalid input', () => {
    expect(slippageLevel(0.5)).toBeNull();
    expect(slippageLevel(5)).toBeNull();
    expect(slippageLevel('')).toBeNull();
    expect(slippageLevel('abc')).toBeNull();
  });
});
