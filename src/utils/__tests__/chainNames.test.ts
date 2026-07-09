import { describe, expect, it } from 'vitest';
import { normalizeChainNameLabel, normalizeName } from '@/utils/chainNames';

describe('chainNames', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeName('  MyName  ')).toBe('myname');
  });

  it('strips a single trailing .chain suffix', () => {
    expect(normalizeChainNameLabel('MyName.chain')).toBe('myname');
    expect(normalizeChainNameLabel('  MyName.CHAIN  ')).toBe('myname');
  });

  it('does not strip embedded .chain segments', () => {
    expect(normalizeChainNameLabel('my.chain.name')).toBe('my.chain.name');
  });

  it('handles empty input', () => {
    expect(normalizeChainNameLabel('')).toBe('');
    expect(normalizeChainNameLabel('   ')).toBe('');
  });
});
