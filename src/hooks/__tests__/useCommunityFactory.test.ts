import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const mockGetFactory = vi.fn();

vi.mock('../useAeSdk', () => ({
  useAeSdk: () => ({ sdk: { id: 'sdk' } }),
}));

vi.mock('../../api/generated', () => ({
  AppService: {
    getFactory: (...args: unknown[]) => mockGetFactory(...args),
  },
}));

const WORDS_COLLECTION = {
  id: 'WORDS-ak_2X6puZgdPKcfjSVdUGs2bvsvkbsCLN8XbKQwSVtqLUBc3518bi',
  name: 'WORDS',
  allowed_name_length: '20',
  allowed_name_chars: [{ CharRangeFromTo: [65, 90] }],
};

describe('useCommunityFactory.loadFactorySchema', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('dedupes concurrent calls across many hook instances into a single network request', async () => {
    let resolveFactory: (value: unknown) => void = () => {};
    mockGetFactory.mockReturnValue(new Promise((resolve) => { resolveFactory = resolve; }));

    const { useCommunityFactory } = await import('../useCommunityFactory');
    // Simulates a feed mounting many rows at once, each with its own hook instance.
    const hooks = Array.from({ length: 10 }, () => renderHook(() => useCommunityFactory()));

    let pending: Promise<unknown>[] = [];
    act(() => {
      pending = hooks.map(({ result }) => result.current.loadFactorySchema());
    });

    expect(mockGetFactory).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFactory({ address: 'ct_factory', collections: { WORDS: WORDS_COLLECTION } });
      await Promise.all(pending);
    });

    expect(mockGetFactory).toHaveBeenCalledTimes(1);
    hooks.forEach(({ result }) => {
      expect(result.current.activeFactoryCollections).toEqual([WORDS_COLLECTION]);
    });
  });

  it('allows a fresh network request once the previous one has settled', async () => {
    mockGetFactory.mockResolvedValue({ address: 'ct_factory', collections: {} });

    const { useCommunityFactory } = await import('../useCommunityFactory');
    const { result } = renderHook(() => useCommunityFactory());

    await act(async () => {
      await result.current.loadFactorySchema();
    });
    await act(async () => {
      await result.current.loadFactorySchema();
    });

    expect(mockGetFactory).toHaveBeenCalledTimes(2);
  });

  it('clears the in-flight request on failure so a later call can retry', async () => {
    mockGetFactory.mockRejectedValueOnce(new Error('network down'));
    mockGetFactory.mockResolvedValueOnce({ address: 'ct_factory', collections: {} });

    const { useCommunityFactory } = await import('../useCommunityFactory');
    const { result } = renderHook(() => useCommunityFactory());

    await act(async () => {
      await expect(result.current.loadFactorySchema()).rejects.toThrow('network down');
    });
    await act(async () => {
      await expect(result.current.loadFactorySchema()).resolves.toBeTruthy();
    });

    expect(mockGetFactory).toHaveBeenCalledTimes(2);
  });
});

describe('useEnsureFactorySchemaLoaded', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('loads the schema once when collections are empty and does not reload once populated', async () => {
    mockGetFactory.mockResolvedValue({
      address: 'ct_factory',
      collections: { WORDS: WORDS_COLLECTION },
    });

    const { useEnsureFactorySchemaLoaded } = await import('../useCommunityFactory');
    const { result, rerender } = renderHook(() => useEnsureFactorySchemaLoaded());

    await waitFor(() => {
      expect(result.current).toEqual([WORDS_COLLECTION]);
    });
    expect(mockGetFactory).toHaveBeenCalledTimes(1);

    rerender();
    rerender();
    expect(mockGetFactory).toHaveBeenCalledTimes(1);
  });

  it('does not fetch again across many mounted instances once loaded', async () => {
    mockGetFactory.mockResolvedValue({
      address: 'ct_factory',
      collections: { WORDS: WORDS_COLLECTION },
    });

    const { useEnsureFactorySchemaLoaded } = await import('../useCommunityFactory');
    const first = renderHook(() => useEnsureFactorySchemaLoaded());
    await waitFor(() => {
      expect(first.result.current).toEqual([WORDS_COLLECTION]);
    });

    // A row mounted after the schema is already loaded should see it immediately,
    // without triggering another request.
    const second = renderHook(() => useEnsureFactorySchemaLoaded());
    expect(second.result.current).toEqual([WORDS_COLLECTION]);
    expect(mockGetFactory).toHaveBeenCalledTimes(1);
  });
});

describe('useHashtagAllowedChars', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('derives a merged char pattern from the loaded collections', async () => {
    mockGetFactory.mockResolvedValue({
      address: 'ct_factory',
      collections: { WORDS: WORDS_COLLECTION },
    });

    const { useHashtagAllowedChars } = await import('../useCommunityFactory');
    const { result } = renderHook(() => useHashtagAllowedChars());

    await waitFor(() => {
      expect(result.current).toContain('A-Z');
    });
  });

  it('returns an empty pattern before the schema has loaded', async () => {
    mockGetFactory.mockReturnValue(new Promise(() => {})); // never resolves within this test

    const { useHashtagAllowedChars } = await import('../useCommunityFactory');
    const { result } = renderHook(() => useHashtagAllowedChars());

    expect(result.current).toBe('');
  });
});
