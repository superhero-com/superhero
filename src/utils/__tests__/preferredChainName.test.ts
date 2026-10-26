import { describe, expect, it } from 'vitest';
import {
  PREFERRED_CHAIN_NAME_PENDING_MS,
  isPreferredChainNamePending,
  mergeServerChainName,
  resolveAccountChainName,
  setPendingChainName,
} from '../preferredChainName';

const ADDRESS = 'ak_owner';
const NOW = 1_700_000_000_000;

describe('resolveAccountChainName', () => {
  it('prefers the linked name over the newest owned name', () => {
    expect(resolveAccountChainName({
      links: { prefaens: 'Second.chain' },
      chain_name: 'first.chain',
      public_name: 'first.chain',
    })).toEqual({ name: 'second.chain', linked: 'second.chain' });
  });

  it('reads the linked name from profile.prefered_aens_name', () => {
    expect(resolveAccountChainName({
      profile: { prefered_aens_name: 'second.chain', chain_name: 'first.chain' } as any,
    })).toEqual({ name: 'second.chain', linked: 'second.chain' });
  });

  it('falls back to the middleware name when nothing is linked', () => {
    expect(resolveAccountChainName({ chain_name: 'first.chain' }))
      .toEqual({ name: 'first.chain', linked: null });
  });

  it('ignores names that are not .chain names', () => {
    expect(resolveAccountChainName({ public_name: 'someone' }))
      .toEqual({ name: null, linked: null });
    expect(resolveAccountChainName(null)).toEqual({ name: null, linked: null });
  });
});

describe('mergeServerChainName', () => {
  it('takes the server name when nothing is pending', () => {
    const next = mergeServerChainName({}, ADDRESS, { name: 'a.chain', linked: null }, NOW);
    expect(next[ADDRESS]).toEqual({ name: 'a.chain' });
  });

  it('keeps the same object when nothing changed', () => {
    const prev = { [ADDRESS]: { name: 'a.chain' } };
    expect(mergeServerChainName(prev, ADDRESS, { name: 'a.chain', linked: null }, NOW)).toBe(prev);
  });

  it('keeps a pending name until the server reports it', () => {
    const pending = setPendingChainName({}, ADDRESS, 'b.chain', NOW);
    const stale = mergeServerChainName(pending, ADDRESS, { name: 'a.chain', linked: 'a.chain' }, NOW + 1000);
    expect(stale).toBe(pending);
    expect(isPreferredChainNamePending(stale[ADDRESS], NOW + 1000)).toBe(true);

    const confirmed = mergeServerChainName(stale, ADDRESS, { name: 'b.chain', linked: 'b.chain' }, NOW + 2000);
    expect(confirmed[ADDRESS]).toEqual({ name: 'b.chain' });
    expect(isPreferredChainNamePending(confirmed[ADDRESS], NOW + 2000)).toBe(false);
  });

  it('keeps a pending unlink until the server drops the linked name', () => {
    const pending = setPendingChainName({}, ADDRESS, null, NOW);
    expect(mergeServerChainName(pending, ADDRESS, { name: 'b.chain', linked: 'b.chain' }, NOW + 1000))
      .toBe(pending);
    expect(mergeServerChainName(pending, ADDRESS, { name: 'a.chain', linked: null }, NOW + 1000)[ADDRESS])
      .toEqual({ name: 'a.chain' });
  });

  it('gives up on a pending name once the window has passed', () => {
    const pending = setPendingChainName({}, ADDRESS, 'b.chain', NOW);
    const later = NOW + PREFERRED_CHAIN_NAME_PENDING_MS + 1;
    expect(mergeServerChainName(pending, ADDRESS, { name: 'a.chain', linked: 'a.chain' }, later)[ADDRESS])
      .toEqual({ name: 'a.chain' });
  });
});

describe('setPendingChainName', () => {
  it('normalises the name and marks it pending', () => {
    const next = setPendingChainName({}, ADDRESS, '  Hero.Chain ', NOW);
    expect(next[ADDRESS]).toEqual({
      name: 'hero.chain',
      pendingUntil: NOW + PREFERRED_CHAIN_NAME_PENDING_MS,
    });
  });
});
