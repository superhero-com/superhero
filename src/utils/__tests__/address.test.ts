import { describe, expect, it } from 'vitest';
import { toTokenLookupParam } from '../address';

/**
 * `TokensService.findByAddress` takes either a token NAME/symbol or a `ct_` sale
 * address. Names resolve uppercased; addresses are case-sensitive base58, so
 * uppercasing one 404s the lookup. Room notifications deep-link with a sale
 * address, which is how the address branch became reachable.
 */
describe('toTokenLookupParam', () => {
  it('uppercases a token name or symbol', () => {
    expect(toTokenLookupParam('doge')).toBe('DOGE');
    expect(toTokenLookupParam('MiXeD')).toBe('MIXED');
  });

  it('leaves a ct_ sale address byte-for-byte alone', () => {
    const sale = 'ct_2AfnEfCSZCTEkxL5Yoi4Yfq6fhZFxb2c1CZ4wUx6GYUqRPQNaJ';
    expect(toTokenLookupParam(sale)).toBe(sale);
  });

  it('treats a CT_ prefix as an address too, rather than corrupting it further', () => {
    // A case-sensitive prefix test would have uppercased the whole thing — which is
    // the exact corruption the guard exists to prevent.
    expect(toTokenLookupParam('CT_2AfnEfCSZCTEkxL5Yoi4')).toBe('CT_2AfnEfCSZCTEkxL5Yoi4');
    expect(toTokenLookupParam('Ct_2AfnEfCSZCTEkxL5Yoi4')).toBe('Ct_2AfnEfCSZCTEkxL5Yoi4');
  });

  it('only matches the prefix at the start', () => {
    // A name that merely CONTAINS ct_ is still a name.
    expect(toTokenLookupParam('mact_token')).toBe('MACT_TOKEN');
  });

  it('handles an empty param without throwing', () => {
    expect(toTokenLookupParam('')).toBe('');
  });
});
