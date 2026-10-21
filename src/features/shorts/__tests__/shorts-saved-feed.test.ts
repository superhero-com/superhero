import {
  describe, expect, it, vi,
} from 'vitest';
import { savedFeedPage } from '../shorts-saved-feed';
import { ShortsFeedWindow, type FeedSnapshot } from '../shorts-feed-window';
import type { Short } from '../types';

const clip = (id: string) => ({ id } as Short);
const signal = () => new AbortController().signal;

describe('Saved feed candidates', () => {
  it('reads saved IDs directly, newest bookmark first, with at most twenty per request', async () => {
    const saved = Array.from({ length: 45 }, (_, i) => `old-${i}`);
    const read = vi.fn(async (ids: string[]) => ({ items: ids.map(clip).reverse() }));
    const page = savedFeedPage(saved, read);
    const first = await page(undefined, signal());
    expect(first.items.map((item) => item.id)).toEqual(saved.slice(25).reverse());
    const second = await page(first.next!, signal());
    const third = await page(second.next!, signal());
    expect(third.next).toBeNull();
    const resolved = [...first.items, ...second.items, ...third.items].map((item) => item.id);
    expect(resolved).toEqual([...saved].reverse());
    expect(read.mock.calls.map(([ids]) => ids.length)).toEqual([20, 20, 5]);
    expect(saved[0]).toBe('old-0');
  });

  it('continues after unavailable IDs without discarding their bookmarks', async () => {
    const saved = Array.from({ length: 21 }, (_, i) => `clip-${i}`);
    const read = vi.fn().mockResolvedValueOnce({ items: [] }).mockResolvedValueOnce({ items: [clip('clip-0')] });
    const page = savedFeedPage(saved, read);
    const first = await page(undefined, signal());
    expect(first).toEqual({ items: [], next: 'saved:20' });
    expect(await page(first.next!, signal())).toEqual({ items: [clip('clip-0')], next: null });
    expect(saved).toHaveLength(21);
  });

  it('normalizes a bounded snapshot of local bookmarks and does not read an empty selection', async () => {
    const read = vi.fn(async (ids: string[]) => ({ items: ids.map(clip) }));
    const saved = ['clip-a', 'clip-b', 'clip-a', '../bad', '', 'x'.repeat(81)];
    const page = savedFeedPage(saved, read);
    saved.push('late');
    expect((await page(undefined, signal())).items.map((item) => item.id)).toEqual(['clip-a', 'clip-b']);
    read.mockClear();
    expect(await savedFeedPage([], read)(undefined, signal())).toEqual({ items: [], next: null });
    expect(read).not.toHaveBeenCalled();
  });

  it('rejects unrelated IDs, duplicates, malformed results and invalid continuations', async () => {
    const read = vi.fn();
    const page = savedFeedPage(['clip-a'], read);
    const invalid = [[clip('unrequested')], [clip('clip-a'), clip('clip-a')], null, {}];
    for (let i = 0; i < invalid.length; i += 1) {
      read.mockResolvedValueOnce({ items: invalid[i] });
      // eslint-disable-next-line no-await-in-loop -- Validate each rejected response independently.
      await expect(page(undefined, signal())).rejects.toThrow('Invalid saved feed response');
    }
    read.mockClear();
    const cursors = ['', '20', 'saved:0', 'saved:01', 'saved:-20', 'saved:1', 'saved:20', 'saved:999999'];
    for (let i = 0; i < cursors.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop -- Reject each cursor before transport.
      await expect(page(cursors[i], signal())).rejects.toThrow('Invalid saved feed continuation');
    }
    expect(read).not.toHaveBeenCalled();
  });

  it('keeps pagination retryable after an outage and forwards cancellation', async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ items: [clip('clip-a')] });
    const page = savedFeedPage(['clip-a'], read);
    const controller = new AbortController();
    await expect(page(undefined, controller.signal)).rejects.toThrow('offline');
    expect(await page(undefined, controller.signal)).toEqual({ items: [clip('clip-a')], next: null });
    expect(read).toHaveBeenLastCalledWith(['clip-a'], controller.signal);
    controller.abort();
    await expect(page(undefined, controller.signal)).rejects.toThrow();
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('retains sixty records and never automatically drains a thousand bookmarks', async () => {
    const saved = Array.from({ length: 1020 }, (_, i) => `clip-${i}`);
    const read = vi.fn(async (ids: string[]) => ({ items: ids.map(clip) }));
    let snapshot: FeedSnapshot | undefined;
    const feed = new ShortsFeedWindow({
      page: savedFeedPage(saved, read), state: read, changed: (value) => { snapshot = value; },
    });
    await feed.refresh(); feed.focus('clip-1019');
    // eslint-disable-next-line no-await-in-loop -- Exercise look-ahead after each page completes.
    for (let i = 0; i < 8; i += 1) await feed.more(true);
    expect(read).toHaveBeenCalledTimes(4);
    expect(snapshot?.items).toHaveLength(60);
    expect(snapshot?.items.some((item) => item.id === 'clip-1019')).toBe(true);
    // eslint-disable-next-line no-await-in-loop -- Continuations depend on the previous cursor.
    while (snapshot?.next) await feed.more();
    expect(read).toHaveBeenCalledTimes(50);
    expect(read.mock.calls.flatMap(([ids]) => ids)).toEqual(saved.slice(-1000).reverse());
    expect(snapshot?.items).toHaveLength(60);
    await feed.refresh();
    expect(read).toHaveBeenCalledTimes(53);
    expect(read.mock.calls.every(([ids]) => ids.length <= 20)).toBe(true);
    feed.stop();
  });
});
