import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'superhero:feedRailRecentSearches';
const MAX_ITEMS = 10;

export type FeedRailRecentEntry =
  | { kind: 'query'; id: string; query: string }
  | {
      kind: 'token';
      id: string;
      /** Search term used when this hit was chosen (for analytics / future use). */
      query: string;
      address: string;
      name: string;
      symbol: string;
    }
  | {
      kind: 'user';
      id: string;
      query: string;
      address: string;
      chain_name: string | null;
    }
  | {
      kind: 'post';
      id: string;
      query: string;
      postId: string;
      slug: string | null;
      preview: string;
    };

function entryDedupeKey(e: FeedRailRecentEntry): string {
  switch (e.kind) {
    case 'query':
      return `q:${e.query.trim().toLowerCase()}`;
    case 'token':
      return `t:${e.address}`;
    case 'user':
      return `u:${e.address}`;
    case 'post':
      return `p:${e.postId}`;
    default:
      return '';
  }
}

function isFeedRailRecentEntry(x: unknown): x is FeedRailRecentEntry {
  if (!x || typeof x !== 'object') return false;
  const k = (x as { kind?: string }).kind;
  if (k === 'query') {
    const q = (x as { query?: unknown }).query;
    return typeof q === 'string' && typeof (x as { id?: unknown }).id === 'string';
  }
  if (k === 'token') {
    const o = x as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.query === 'string' && typeof o.address === 'string'
      && typeof o.name === 'string' && typeof o.symbol === 'string';
  }
  if (k === 'user') {
    const o = x as Record<string, unknown>;
    return typeof o.id === 'string' && typeof o.query === 'string' && typeof o.address === 'string'
      && (o.chain_name === null || typeof o.chain_name === 'string');
  }
  if (k === 'post') {
    const o = x as Record<string, unknown>;
    const idsOk = typeof o.id === 'string' && typeof o.query === 'string' && typeof o.postId === 'string';
    const slugOk = o.slug == null || typeof o.slug === 'string';
    return idsOk && slugOk && typeof o.preview === 'string';
  }
  return false;
}

function readStored(): FeedRailRecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.reduce<FeedRailRecentEntry[]>((acc, el) => {
      if (typeof el === 'string') {
        const q = el.trim();
        if (q) acc.push({ kind: 'query', id: `q-${q.toLowerCase()}`, query: q });
        return acc;
      }
      if (isFeedRailRecentEntry(el)) acc.push(el);
      return acc;
    }, []);
  } catch {
    return [];
  }
}

function writeStored(items: FeedRailRecentEntry[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota / private mode
  }
}

function normalizeList(
  next: FeedRailRecentEntry,
  prev: FeedRailRecentEntry[],
): FeedRailRecentEntry[] {
  const key = entryDedupeKey(next);
  const without = prev.filter((e) => entryDedupeKey(e) !== key);
  return [next, ...without].slice(0, MAX_ITEMS);
}

/**
 * Persisted recent feed-rail interactions: typed Explore queries and concrete
 * token / user / post picks (stored so the list can mirror dropdown presentation).
 */
export function useFeedRailRecentSearches() {
  const [items, setItems] = useState<FeedRailRecentEntry[]>(() => readStored());

  useEffect(() => {
    setItems(readStored());
  }, []);

  /**
   * Persist before `setState` so a same-tick `navigate()` unmount does not skip the updater
   * and drop localStorage writes.
   */
  const pushRecent = useCallback((entry: FeedRailRecentEntry) => {
    const prev = readStored();
    const next = normalizeList(entry, prev);
    writeStored(next);
    setItems(next);
  }, []);

  const removeRecent = useCallback((id: string) => {
    const prev = readStored();
    const next = prev.filter((e) => e.id !== id);
    writeStored(next);
    setItems(next);
  }, []);

  const clearAll = useCallback(() => {
    writeStored([]);
    setItems([]);
  }, []);

  return {
    items,
    pushRecent,
    removeRecent,
    clearAll,
  };
}
