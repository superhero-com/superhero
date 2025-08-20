import { describe, it, expect } from 'vitest';
import { subSlippage, addSlippage } from '../dex';

describe('Liquidity math helpers', () => {
  it('applies subSlippage correctly', () => {
    const base = 1000n;
    expect(subSlippage(base, 1)).toBe(990n);
    expect(subSlippage(base, 0)).toBe(1000n);
  });
  it('applies addSlippage correctly', () => {
    const base = 1000n;
    expect(addSlippage(base, 1)).toBe(1010n);
    expect(addSlippage(base, 0)).toBe(1000n);
  });
});


