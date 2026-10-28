import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  createStore, Provider, useAtomValue,
} from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import {
  chainNameLookupCheckedAtAtom, chainNamesAtom, preferredChainNamesAtom,
} from '@/atoms/walletAtoms';
import { AccountsService } from '@/api/generated/services/AccountsService';
import { useChainName, useStorePostSenderChainNames } from '@/hooks/useChainName';
import { PREFERRED_CHAIN_NAME_SEEN_TTL_MS, setPendingChainName } from '@/utils/preferredChainName';

type TestPost = {
  sender_address?: string | null;
  sender?: { address?: string | null; public_name?: string | null } | null;
} | null | undefined;

/**
 * Render useStorePostSenderChainNames against an isolated jotai store and return the resulting
 * chainNamesAtom value. The feed gets author names from posts info, so this hook is what fills the
 * chain-name cache when posts load (before any middleware names-by-address lookup is needed).
 */
function renderStoreNames(posts: TestPost[]) {
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    createElement(Provider, { store }, children)
  );
  const { result } = renderHook(
    () => {
      useStorePostSenderChainNames(posts);
      return useAtomValue(chainNamesAtom);
    },
    { wrapper },
  );
  return result;
}

describe('useStorePostSenderChainNames', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('stores the sender .chain name from posts info keyed by sender address', () => {
    const result = renderStoreNames([
      { sender: { address: 'ak_alice', public_name: 'alice.chain' } },
    ]);
    expect(result.current).toEqual({ ak_alice: 'alice.chain' });
  });

  it('trims surrounding whitespace but preserves the original casing', () => {
    const result = renderStoreNames([
      { sender: { address: 'ak_bob', public_name: '  BoB.Chain  ' } },
    ]);
    // normalizeChainName accepts the `.chain` suffix case-insensitively but stores the value as-is.
    expect(result.current.ak_bob).toBe('BoB.Chain');
  });

  it('falls back to sender_address when sender.address is missing', () => {
    const result = renderStoreNames([
      { sender_address: 'ak_carol', sender: { public_name: 'carol.chain' } },
    ]);
    expect(result.current).toEqual({ ak_carol: 'carol.chain' });
  });

  it('ignores public names that are not .chain names', () => {
    const result = renderStoreNames([
      { sender: { address: 'ak_dave', public_name: 'dave' } },
    ]);
    expect(result.current).toEqual({});
  });

  it('ignores posts without an address', () => {
    const result = renderStoreNames([
      { sender: { public_name: 'noaddress.chain' } },
    ]);
    expect(result.current).toEqual({});
  });

  it('ignores null/undefined posts and empty lists', () => {
    expect(renderStoreNames([]).current).toEqual({});
    expect(renderStoreNames([null, undefined]).current).toEqual({});
  });

  it('does not write to storage again for names it already stored', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(Provider, { store }, children)
    );
    const posts = [{ sender: { address: 'ak_alice', public_name: 'alice.chain' } }];
    // A new array on every render, as the feed passes one.
    const { rerender } = renderHook(() => useStorePostSenderChainNames([...posts]), { wrapper });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    try {
      rerender();
      expect(setItem).not.toHaveBeenCalled();
    } finally {
      setItem.mockRestore();
    }
  });
});

describe('useChainName', () => {
  const ADDRESS = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';

  function renderName(setup: (store: ReturnType<typeof createStore>) => void, lookup = false) {
    const store = createStore();
    setup(store);
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(Provider, { store }, children)
    );
    const { result } = renderHook(() => useChainName(ADDRESS, { lookup }), { wrapper });
    return { store, result };
  }

  // The atoms persist to localStorage and reload it on mount.
  beforeEach(() => window.localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it('shows the preferred name over the newest owned name', () => {
    const { result } = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'picked.chain', seenAt: Date.now() } });
    });
    expect(result.current.chainName).toBe('picked.chain');
  });

  it.each([
    ['was never seen', undefined],
    ['was last seen too long ago', Date.now() - PREFERRED_CHAIN_NAME_SEEN_TTL_MS],
  ])("falls back to the owned name when another account's preferred name %s", (_, seenAt) => {
    const { result } = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'picked.chain', seenAt } });
    });
    expect(result.current.chainName).toBe('newest.chain');
  });

  it("keeps the active account's preferred name without a recent sighting", () => {
    const { result } = renderName((store) => {
      store.set(activeAccountAtom, ADDRESS);
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'picked.chain' } });
    });
    expect(result.current.chainName).toBe('picked.chain');
  });

  it("drops another account's preferred name once the lookup finds no name", async () => {
    vi.spyOn(AccountsService, 'getChainNamesForAddresses').mockResolvedValue({ [ADDRESS]: null } as any);
    const { store, result } = renderName((s) => {
      s.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'expired.chain', seenAt: Date.now() } });
    }, true);
    await waitFor(() => expect(store.get(preferredChainNamesAtom)).toEqual({}));
    expect(result.current.chainName).toBeUndefined();
  });

  it("leaves the active account's preferred name to its own sync", async () => {
    const lookup = vi.spyOn(AccountsService, 'getChainNamesForAddresses')
      .mockResolvedValue({ [ADDRESS]: null } as any);
    const { store } = renderName((s) => {
      s.set(activeAccountAtom, ADDRESS);
      s.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'picked.chain' } });
    }, true);
    await waitFor(() => (
      expect(store.get(chainNameLookupCheckedAtAtom)[ADDRESS]).toBeGreaterThan(0)
    ));
    expect(lookup).toHaveBeenCalled();
    expect(store.get(preferredChainNamesAtom)).toEqual({ [ADDRESS]: { name: 'picked.chain' } });
  });

  it('shows a just-picked name right away', () => {
    const { result } = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, setPendingChainName({}, ADDRESS, 'other.chain'));
    });
    expect(result.current.chainName).toBe('other.chain');
  });

  it('falls back to the owned name when no preferred one is known', () => {
    const { result } = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, {});
    });
    expect(result.current.chainName).toBe('newest.chain');
  });
});

describe('useStorePostSenderChainNames preferred names', () => {
  it('records the public name as the displayed name', () => {
    const store = createStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(Provider, { store }, children)
    );
    renderHook(
      () => useStorePostSenderChainNames([
        { sender: { address: 'ak_erin', public_name: 'Picked.chain' } },
      ]),
      { wrapper },
    );
    expect(store.get(preferredChainNamesAtom)).toEqual({
      ak_erin: { name: 'picked.chain', seenAt: expect.any(Number) },
    });
  });

  it.each([
    ['keeps a recent sighting as is', 60_000, false],
    ['re-stamps a sighting over an hour old', 2 * 60 * 60_000, true],
  ])('%s', (_, age, restamped) => {
    const seenAt = Date.now() - age;
    const store = createStore();
    store.set(preferredChainNamesAtom, { ak_erin: { name: 'picked.chain', seenAt } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(Provider, { store }, children)
    );
    renderHook(
      () => useStorePostSenderChainNames([
        { sender: { address: 'ak_erin', public_name: 'picked.chain' } },
      ]),
      { wrapper },
    );
    expect(store.get(preferredChainNamesAtom).ak_erin.seenAt! > seenAt).toBe(restamped);
  });
});
