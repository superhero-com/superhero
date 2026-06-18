import { createElement, type ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it,
} from 'vitest';
import {
  createStore, Provider, useAtomValue,
} from 'jotai';
import { chainNamesAtom } from '@/atoms/walletAtoms';
import { useStorePostSenderChainNames } from '@/hooks/useChainName';

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
