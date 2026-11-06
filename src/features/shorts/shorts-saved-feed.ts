import type { FeedPage } from './shorts-feed-window';
import type { Short } from './types';

type ReadState = (ids: string[], signal: AbortSignal) => Promise<{ items: Short[] }>;
const PAGE_SIZE = 20;

/** Bookmarks stay in this browser. Resolve their IDs through the public eligibility endpoint. */
export function savedFeedPage(saved: readonly string[], read: ReadState) {
  // Snapshot the selection: a bookmark change creates a new feed and cancels this one.
  const selected = [...new Set(saved.slice(-1000).reverse().filter((id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(id)))];
  return async (cursor: string | undefined, signal: AbortSignal): Promise<FeedPage> => {
    signal.throwIfAborted();
    const start = cursor === undefined ? 0 : Number(cursor.slice(6));
    if (cursor !== undefined && (!/^saved:[1-9][0-9]{0,3}$/.test(cursor)
      || start % PAGE_SIZE !== 0 || start >= selected.length)) throw new Error('Invalid saved feed continuation');
    const ids = selected.slice(start, start + PAGE_SIZE);
    if (!ids.length) return { items: [], next: null };
    const { items } = await read(ids, signal);
    signal.throwIfAborted();
    if (!Array.isArray(items) || items.length > ids.length
      || items.some((item) => !item || !ids.includes(item.id))
      || new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Invalid saved feed response');
    // Advance over missing/withdrawn/restricted IDs as well, without deleting bookmarks.
    const end = start + ids.length;
    const found = new Map(items.map((item) => [item.id, item]));
    return {
      items: ids.flatMap((id) => (found.has(id) ? [found.get(id)!] : [])),
      next: end < selected.length ? `saved:${end}` : null,
    };
  };
}
