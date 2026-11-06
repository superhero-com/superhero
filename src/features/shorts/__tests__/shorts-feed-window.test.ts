import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsFeedWindow, type FeedSnapshot, type FeedPage } from '../shorts-feed-window';
import type { Short } from '../types';
import { ShortsApiError } from '../api';

afterEach(() => vi.useRealTimers());

const clip = (n: number) => ({ id: `clip-${n}`, likes: n, title: `Short ${n}` } as Short);
const batch = (start: number) => Array.from({ length: 20 }, (_, i) => clip(start + i));
const deferred = <T, >() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
};
const fixture = () => {
  let snapshot: FeedSnapshot | undefined;
  const page = vi.fn(async (cursor?: string): Promise<FeedPage> => {
    const start = Number(cursor || 0);
    return { items: batch(start), next: String(start + 20) };
  });
  const state = vi.fn(async (ids: string[]) => ({ items: ids.map((id) => ({ id, likes: 999 } as Short)) }));
  const changed = vi.fn((value: FeedSnapshot) => { snapshot = value; });
  const feed = new ShortsFeedWindow({ page, state, changed });
  return {
    feed, page, state, changed, get snapshot() { return snapshot!; },
  };
};

describe('bounded Shorts feed window', () => {
  it('recovers a temporarily busy refresh without partially committing batches or losing its cursor', async () => {
    const f = fixture(); await f.feed.refresh(); await f.feed.more();
    vi.useFakeTimers();
    f.state.mockResolvedValueOnce({ items: [clip(0)] }).mockRejectedValueOnce(new ShortsApiError('busy', 503))
      .mockResolvedValueOnce({ items: [clip(25)] });
    const pending = f.feed.refresh();
    await vi.advanceTimersByTimeAsync(1);
    expect(f.snapshot.items).toHaveLength(40); expect(f.snapshot.loading).toBe(true);
    expect(f.feed.refresh()).toBe(pending);
    await vi.advanceTimersByTimeAsync(999); await pending;
    expect(f.snapshot.items).toEqual([clip(0), clip(25)]);
    expect(f.snapshot).toMatchObject({ next: '40', loading: false, error: '' });
    expect(f.state.mock.calls.map(([ids]) => ids)).toEqual([
      batch(0).map((s) => s.id), batch(20).map((s) => s.id), batch(20).map((s) => s.id),
    ]);
    f.feed.stop();
  });

  it('bounds busy retries and leaves the same page available for explicit retry', async () => {
    const f = fixture(); await f.feed.refresh();
    vi.useFakeTimers(); f.page.mockRejectedValue(new ShortsApiError('busy', 503));
    const pending = f.feed.more();
    await vi.advanceTimersByTimeAsync(3001); await pending;
    expect(f.page).toHaveBeenCalledTimes(4); // Head, then three attempts at its continuation.
    expect(f.page.mock.calls.slice(1).map(([cursor]) => cursor)).toEqual(['20', '20', '20']);
    expect(f.snapshot.items).toEqual(batch(0)); expect(f.snapshot.error).toBeTruthy();
    f.page.mockResolvedValue({ items: batch(20), next: null });
    await f.feed.more(); expect(f.snapshot.items).toHaveLength(40); expect(f.snapshot.error).toBe('');
    f.feed.stop();
  });

  it('cancels pending backoff on a scope change and does not retry non-transient responses', async () => {
    const f = fixture(); vi.useFakeTimers();
    f.page.mockRejectedValue(new ShortsApiError('busy', 503));
    const pending = f.feed.refresh(); await vi.advanceTimersByTimeAsync(1);
    const writes = f.changed.mock.calls.length; f.feed.stop();
    await vi.advanceTimersByTimeAsync(5000); await pending;
    expect(f.page).toHaveBeenCalledTimes(1); expect(f.changed).toHaveBeenCalledTimes(writes);
    await Promise.all([400, 401, 403, 404, 409, 429].map(async (status) => {
      const other = fixture(); other.page.mockRejectedValue(new ShortsApiError('denied', status));
      await other.feed.refresh();
      expect(other.page).toHaveBeenCalledTimes(1); other.feed.stop();
    }));
  });

  it('reloads changed Following candidates after missed events, even from an empty window', async () => {
    const first = 'a'.repeat(64); const second = 'b'.repeat(64);
    let snapshot: FeedSnapshot | undefined;
    const page = vi.fn().mockResolvedValueOnce({ items: [], next: null, revision: first })
      .mockResolvedValue({ items: batch(0), next: 'more', revision: second });
    const state = vi.fn().mockResolvedValue({ items: [], revision: second });
    const feed = new ShortsFeedWindow({
      revisioned: true, page, state, changed: (s) => { snapshot = s; },
    });
    await feed.refresh(); expect(snapshot?.items).toEqual([]);
    await feed.refresh();
    expect(state).toHaveBeenCalledWith([], expect.any(AbortSignal));
    expect(snapshot?.items).toEqual(batch(0)); expect(page).toHaveBeenCalledTimes(2);
    expect(page.mock.calls[1][0]).toBeUndefined();
    feed.stop();
  });

  it('never mixes Following revisions across pages or refreshed batches and preserves retry on failure', async () => {
    const first = 'a'.repeat(64); const second = 'b'.repeat(64);
    let snapshot: FeedSnapshot | undefined;
    const page = vi.fn().mockResolvedValueOnce({ items: batch(0), next: '20', revision: first })
      .mockResolvedValueOnce({ items: batch(20), next: null, revision: first });
    const state = vi.fn().mockResolvedValueOnce({ items: batch(0), revision: first })
      .mockResolvedValue({ items: [], revision: second });
    const feed = new ShortsFeedWindow({
      revisioned: true, page, state, changed: (s) => { snapshot = s; },
    });
    await feed.refresh(); await feed.more();
    page.mockRejectedValueOnce(new Error('offline'));
    await feed.refresh();
    expect(snapshot?.items).toHaveLength(40); expect(snapshot?.error).toBeTruthy();
    page.mockResolvedValueOnce({ items: [clip(99)], next: null, revision: second });
    await feed.refresh();
    expect(snapshot?.items).toEqual([clip(99)]); expect(snapshot?.error).toBe('');
    state.mockResolvedValueOnce({ items: [clip(99)] });
    await feed.refresh(); expect(snapshot?.error).toBeTruthy();
    feed.stop();
  });

  it('loads one page and refreshes only the loaded IDs without changing continuation', async () => {
    const f = fixture(); await f.feed.refresh();
    expect(f.page).toHaveBeenCalledTimes(1);
    expect(f.snapshot).toMatchObject({
      ready: true, next: '20', error: '', loading: false,
    });
    await f.feed.refresh();
    expect(f.page).toHaveBeenCalledTimes(1); expect(f.state).toHaveBeenCalledTimes(1);
    expect(f.snapshot.items.map((s) => s.id)).toEqual(batch(0).map((s) => s.id));
    expect(f.snapshot.items.every((s) => s.likes === 999)).toBe(true);
    expect(f.snapshot.next).toBe('20');
  });

  it('bounds retained metadata to sixty and preserves the active video during eviction', async () => {
    const f = fixture(); await f.feed.refresh(); f.feed.focus('clip-2');
    // eslint-disable-next-line no-await-in-loop -- Each next cursor depends on the preceding response.
    for (let i = 0; i < 8; i += 1) await f.feed.more();
    expect(f.snapshot.items).toHaveLength(60);
    expect(f.snapshot.items[0].id).toBe('clip-2');
    expect(f.snapshot.items.at(-1)?.id).toBe('clip-179');
    await f.feed.refresh();
    expect(f.state).toHaveBeenCalledTimes(3);
    expect(f.state.mock.calls.every(([ids]) => ids.length <= 20)).toBe(true);
  });

  it('does not drain an empty or personally filtered catalog automatically', async () => {
    const f = fixture(); f.page.mockImplementation(async (cursor?: string) => ({ items: [], next: String(Number(cursor || 0) + 20) }));
    await f.feed.refresh();
    // eslint-disable-next-line no-await-in-loop -- Exercise repeated automatic continuation after each page finishes.
    for (let i = 0; i < 10; i += 1) await f.feed.more(true);
    expect(f.page).toHaveBeenCalledTimes(4);
    expect(f.snapshot).toMatchObject({ ready: true, next: '80', items: [] });
    await f.feed.more(); expect(f.page).toHaveBeenCalledTimes(5);
    f.feed.focus('visible-video'); await f.feed.more(true);
    expect(f.page).toHaveBeenCalledTimes(6);
  });

  it('coalesces overlapping refresh and page requests', async () => {
    const f = fixture(); const
      pending = deferred<{ items: Short[]; next: string }>();
    f.page.mockReturnValueOnce(pending.promise);
    const one = f.feed.refresh(); const
      two = f.feed.refresh();
    await Promise.resolve(); expect(f.page).toHaveBeenCalledTimes(1);
    expect(one).toBe(two); pending.resolve({ items: batch(0), next: '20' }); await one;
    const more = f.feed.more(); expect(f.feed.refresh()).toBe(more); await more;
    expect(f.state).not.toHaveBeenCalled();
  });

  it('retains the current window and cursor on a failed page and permits explicit retry', async () => {
    const f = fixture(); await f.feed.refresh();
    f.page.mockRejectedValueOnce(new Error('offline')); await f.feed.more(true);
    expect(f.snapshot.items).toEqual(batch(0)); expect(f.snapshot.next).toBe('20');
    expect(f.snapshot.error).toContain('try again');
    await f.feed.more(true); expect(f.page).toHaveBeenCalledTimes(2);
    await f.feed.more(); expect(f.snapshot.error).toBe(''); expect(f.snapshot.items).toHaveLength(40);
    expect(f.page.mock.calls[2][0]).toBe('20');
  });

  it('commits refresh batches together and removes newly unavailable content', async () => {
    const f = fixture(); await f.feed.refresh(); await f.feed.more();
    f.state.mockResolvedValueOnce({ items: [clip(0)] }).mockRejectedValueOnce(new Error('offline'));
    await f.feed.refresh(); expect(f.snapshot.items).toHaveLength(40);
    f.state.mockResolvedValueOnce({ items: [clip(0)] }).mockResolvedValueOnce({ items: [] });
    await f.feed.refresh(); expect(f.snapshot.items).toEqual([clip(0)]);
  });

  it('cancels old-scope work and ignores late responses even when transport ignores abort', async () => {
    const f = fixture(); const
      pending = deferred<{ items: Short[]; next: string }>();
    f.page.mockReturnValueOnce(pending.promise); const loading = f.feed.refresh();
    await Promise.resolve(); const before = f.changed.mock.calls.length;
    f.feed.stop(); pending.resolve({ items: batch(0), next: '20' }); await loading;
    expect(f.changed).toHaveBeenCalledTimes(before); expect(f.feed.stopped).toBe(true);
    await f.feed.more(); await f.feed.restart(); expect(f.page).toHaveBeenCalledTimes(1);
  });

  it('rejects repeated cursors, oversized responses and unexpected refreshed IDs', async () => {
    const f = fixture(); await f.feed.refresh();
    f.page.mockResolvedValueOnce({ items: batch(20), next: '20' }); await f.feed.more();
    expect(f.snapshot.items).toEqual(batch(0)); expect(f.snapshot.error).toBeTruthy();
    f.page.mockResolvedValueOnce({ items: [...batch(20), clip(50)], next: '40' }); await f.feed.more();
    expect(f.snapshot.items).toEqual(batch(0));
    f.state.mockResolvedValueOnce({ items: [clip(999)] }); await f.feed.refresh();
    expect(f.snapshot.items).toEqual(batch(0)); expect(f.snapshot.error).toBeTruthy();
  });

  it('restarts at the latest page explicitly and handles an exhausted catalog', async () => {
    const f = fixture(); await f.feed.refresh(); await f.feed.more();
    f.page.mockResolvedValueOnce({ items: batch(100), next: null }); await f.feed.restart();
    expect(f.snapshot.items).toEqual(batch(100)); expect(f.snapshot.next).toBeNull();
    await f.feed.more(); expect(f.page).toHaveBeenCalledTimes(3);
    expect(f.page.mock.calls[2][0]).toBeUndefined();
  });
});
