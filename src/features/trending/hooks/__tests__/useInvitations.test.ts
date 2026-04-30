import { describe, expect, it } from 'vitest';

import { getArgumentAccountAddresses } from '../useInvitations';

describe('getArgumentAccountAddresses', () => {
  it('extracts account addresses from middleware argument shapes', () => {
    expect(getArgumentAccountAddresses('ak_single')).toEqual(['ak_single']);

    expect(getArgumentAccountAddresses({
      type: 'address',
      value: 'ak_wrapped',
    })).toEqual(['ak_wrapped']);

    expect(getArgumentAccountAddresses([
      { type: 'address', value: 'ak_first' },
      'ak_second',
      { type: 'int', value: '123' },
    ])).toEqual(['ak_first', 'ak_second']);

    expect(getArgumentAccountAddresses({
      type: 'list',
      value: [
        { type: 'address', value: 'ak_batched_one' },
        { type: 'address', value: 'ak_batched_two' },
      ],
    })).toEqual(['ak_batched_one', 'ak_batched_two']);
  });
});
