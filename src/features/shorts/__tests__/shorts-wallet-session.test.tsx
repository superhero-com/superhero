import { createStore } from 'jotai';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat' } }));
const session = {
  address: 'ak_creator',
  token: 'test-session',
  expiresAt: Date.now() + 60000,
  api: 'http://127.0.0.1:3334',
  network: 'ae_uat',
  contract: 'ct_shorts',
};
beforeEach(() => { vi.resetModules(); sessionStorage.clear(); });

describe('Tab-scoped creator access', () => {
  it('restores the unexpired session after a document reload', async () => {
    sessionStorage.setItem('shorts:creator-session', JSON.stringify(session));
    const { creatorSessionAtom } = await import('../shorts-wallet-session');
    expect(createStore().get(creatorSessionAtom)).toEqual(session);
  });

  it.each([
    '{broken', JSON.stringify({ ...session, expiresAt: 1 }),
    JSON.stringify({ ...session, api: 'http://another.invalid' }),
    JSON.stringify({ ...session, network: 'ae_mainnet' }),
    JSON.stringify({ ...session, token: null }),
  ])('ignores malformed, expired or wrong-scope tab data: %s', async (value) => {
    sessionStorage.setItem('shorts:creator-session', value);
    const { creatorSessionAtom } = await import('../shorts-wallet-session');
    expect(createStore().get(creatorSessionAtom)).toBeUndefined();
  });

  it('continues in memory when tab storage is unavailable', async () => {
    const { creatorSessionAtom } = await import('../shorts-wallet-session');
    const store = createStore();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
    expect(() => store.set(creatorSessionAtom, session)).not.toThrow();
    expect(store.get(creatorSessionAtom)).toEqual(session);
    store.set(creatorSessionAtom, undefined);
    expect(store.get(creatorSessionAtom)).toBeUndefined();
  });
});
