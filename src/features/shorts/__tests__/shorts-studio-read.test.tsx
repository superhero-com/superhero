import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { studioContentQuery, useShortsStudioRead } from '../use-shorts-studio-read';
import { request } from '../api';

vi.mock('../api', () => ({ request: vi.fn() }));
const read = vi.mocked(request);
beforeEach(() => { vi.useFakeTimers(); read.mockReset(); });
afterEach(() => vi.useRealTimers());
const tick = () => act(async () => { await vi.advanceTimersByTimeAsync(151); });

describe('Scoped Studio reads', () => {
  it('debounces searches and aborts obsolete pages without flashing another scope', async () => {
    let finish!: (value: unknown) => void;
    read.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const hook = renderHook(({ path, token, scope }) => useShortsStudioRead<{ id: string }>(path, token, scope, 0), {
      initialProps: { path: '/studio/content?q=first', token: 'alice', scope: 'ct_one' },
    });
    await tick();
    const signal = read.mock.calls[0][3]?.signal;
    read.mockResolvedValue({ id: 'new' });
    hook.rerender({ path: '/studio/content?q=second', token: 'bob', scope: 'ct_two' });
    expect(signal?.aborted).toBe(true);
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.loading).toBe(true);
    await act(async () => { finish({ id: 'old private record' }); });
    expect(hook.result.current.data).toBeUndefined();
    hook.rerender({ path: '/studio/content?q=third', token: 'bob', scope: 'ct_two' });
    await tick();
    expect(read).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenLastCalledWith('/studio/content?q=third', undefined, 'bob', expect.objectContaining({ timeout: 30000 }));
    expect(hook.result.current.data).toEqual({ id: 'new' });
  });

  it('retains a same-page background result on failure and supports retry without resetting the cursor', async () => {
    read.mockResolvedValue({ items: ['older-short'] });
    const hook = renderHook(({ revision }) => useShortsStudioRead('/studio/content?cursor=older', 'alice', 'contract', revision), { initialProps: { revision: 0 } });
    await tick();
    read.mockRejectedValue(new Error('Unavailable'));
    hook.rerender({ revision: 1 });
    expect(hook.result.current.data).toEqual({ items: ['older-short'] });
    await tick();
    expect(hook.result.current.error).toBe('Unavailable');
    expect(hook.result.current.loading).toBe(false);
    read.mockResolvedValue({ items: ['updated-short'] });
    act(() => hook.result.current.retry()); await tick();
    expect(hook.result.current.data).toEqual({ items: ['updated-short'] });
    expect(hook.result.current.error).toBe('');
    expect(read.mock.calls.every(([path]) => path === '/studio/content?cursor=older')).toBe(true);
  });

  it('drops a previous period and clears private records immediately on logout', async () => {
    read.mockResolvedValue({ period: 28 });
    const hook = renderHook(({ path, token }) => useShortsStudioRead(path, token, 'scope', 0), {
      initialProps: { path: '/studio/video/older?days=28', token: 'alice' as string | undefined },
    });
    await tick();
    hook.rerender({ path: '/studio/video/older?days=7', token: 'alice' });
    expect(hook.result.current.data).toBeUndefined();
    read.mockResolvedValue({ period: 7 }); await tick();
    expect(hook.result.current.data).toEqual({ period: 7 });
    hook.rerender({ path: '/studio/video/older?days=7', token: undefined });
    expect(hook.result.current.data).toBeUndefined();
    expect(hook.result.current.loading).toBe(false);
  });

  it('sends only supported library parameters and preserves literal search text', () => {
    const query = new URLSearchParams(studioContentQuery('?q=100%25+art&sort=views&status=draft&cursor=next&address=other&page=4', 7));
    expect(Object.fromEntries(query)).toEqual({
      q: '100% art', sort: 'views', status: 'draft', cursor: 'next', days: '7',
    });
    expect(new URLSearchParams(studioContentQuery('?sort=invalid&status=invalid', 90)).get('sort')).toBe('newest');
  });
});
