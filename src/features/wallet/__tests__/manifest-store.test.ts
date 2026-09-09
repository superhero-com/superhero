import {
  beforeEach, describe, expect, it,
} from 'vitest';
import {
  clearManifest, indexForAddress, loadManifest, manifestForFirstAccount, saveManifest,
} from '../manifest-store';

const KEY = 'wallet.inlineManifest';
const ADDRESS = 'ak_21SBPc3yHP7bpQDvD1KMKzZZEgLtSXpDsK97LTjVwjiskra6Ka';

describe('inline wallet cleartext manifest', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips a manifest', () => {
    const manifest = manifestForFirstAccount(ADDRESS);
    saveManifest(manifest);
    expect(loadManifest()).toEqual(manifest);
  });

  it('the first-account manifest is index 0 and active', () => {
    expect(manifestForFirstAccount(ADDRESS)).toEqual({
      accounts: [{ index: 0, address: ADDRESS, label: 'Account 1' }],
      activeAddress: ADDRESS,
    });
  });

  it('resolves an address to its derivation index', () => {
    saveManifest({
      accounts: [
        { index: 0, address: ADDRESS, label: 'Account 1' },
        { index: 4, address: 'ak_other', label: 'Account 2' },
      ],
      activeAddress: ADDRESS,
    });
    expect(indexForAddress(ADDRESS)).toBe(0);
    expect(indexForAddress('ak_other')).toBe(4);
  });

  it('returns null for an address that is not an inline account — the delegated-relay fallthrough', () => {
    saveManifest(manifestForFirstAccount(ADDRESS));
    expect(indexForAddress('ak_externalWallet')).toBeNull();
  });

  it('returns null when nothing is stored', () => {
    expect(loadManifest()).toBeNull();
    expect(indexForAddress(ADDRESS)).toBeNull();
  });

  it('treats malformed or wrong-shaped JSON as absent rather than throwing', () => {
    localStorage.setItem(KEY, 'not json{');
    expect(loadManifest()).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ accounts: 'nope' }));
    expect(loadManifest()).toBeNull();

    localStorage.setItem(KEY, JSON.stringify({ accounts: [{ address: ADDRESS }] }));
    expect(loadManifest()).toBeNull();
  });

  it('clearManifest removes it', () => {
    saveManifest(manifestForFirstAccount(ADDRESS));
    clearManifest();
    expect(loadManifest()).toBeNull();
  });

  it('never persists anything but public data', () => {
    saveManifest(manifestForFirstAccount(ADDRESS));
    const raw = localStorage.getItem(KEY) ?? '';
    // Guards the file's own invariant: a future field named like a secret must
    // not slip into the cleartext manifest.
    expect(raw).not.toMatch(/mnemonic|passphrase|secret|seed|recovery|dek|kek/i);
  });
});
