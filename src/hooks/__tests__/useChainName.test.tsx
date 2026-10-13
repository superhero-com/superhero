import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import {
  createStore, Provider, useAtomValue,
} from 'jotai';
import { chainNamesAtom, preferredChainNamesAtom } from '@/atoms/walletAtoms';
import { useChainName, useStorePostSenderChainNames } from '@/hooks/useChainName';
import { setPendingChainName } from '@/utils/preferredChainName';

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
});

describe('useChainName', () => {
  const ADDRESS = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';

  function renderName(setup: (store: ReturnType<typeof createStore>) => void) {
    const store = createStore();
    setup(store);
    const wrapper = ({ children }: { children: ReactNode }) => (
      createElement(Provider, { store }, children)
    );
    return renderHook(() => useChainName(ADDRESS, { lookup: false }), { wrapper }).result;
  }

  it('shows the preferred name over the newest owned name', () => {
    const result = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, { [ADDRESS]: { name: 'picked.chain' } });
    });
    expect(result.current.chainName).toBe('picked.chain');
  });

  it('shows a just-picked name right away', () => {
    const result = renderName((store) => {
      store.set(chainNamesAtom, { [ADDRESS]: 'newest.chain' });
      store.set(preferredChainNamesAtom, setPendingChainName({}, ADDRESS, 'other.chain'));
    });
    expect(result.current.chainName).toBe('other.chain');
  });

  it('falls back to the owned name when no preferred one is known', () => {
    const result = renderName((store) => {
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
    expect(store.get(preferredChainNamesAtom)).toEqual({ ak_erin: { name: 'picked.chain' } });
  });
});
