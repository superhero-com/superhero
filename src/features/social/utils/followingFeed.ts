// Client-side "Following" feed. The posts API filters by one `account_address`
// at a time, so the feed is a k-way merge of per-account newest-first streams:
// each followed account keeps a buffer of fetched posts plus the next page to
// request, and a page of the feed is taken by repeatedly emitting the newest
// buffered head. A stream only needs refilling once its buffer runs dry, so
// requests stay lazy after the first page.

export type FollowingFeedPost = {
  id: string;
  created_at: string;
};

export type AccountPostsPage<T> = {
  items: T[];
  hasMore: boolean;
};

export type AccountStream<T> = {
  address: string;
  /** Next page number to request from the posts API (1-based). */
  nextPage: number;
  buffer: T[];
  exhausted: boolean;
};

export type FollowingFeedState<T> = {
  streams: AccountStream<T>[];
  /** Ids already emitted, so a post seen twice across pages is shown once. */
  seenIds: string[];
};

export type FollowingFeedPage<T> = {
  items: T[];
  /** State to resume from for the next page; `undefined` once every stream is drained. */
  nextState: FollowingFeedState<T> | undefined;
};

export type FetchAccountPosts<T> = (address: string, page: number) => Promise<AccountPostsPage<T>>;

export const FOLLOWING_FEED_PAGE_SIZE = 10;
export const FOLLOWING_FEED_CONCURRENCY = 6;
/** Upper bound on followed accounts merged into the feed. */
export const FOLLOWING_FEED_MAX_ACCOUNTS = 200;

export function createFollowingFeedState<T>(addresses: string[]): FollowingFeedState<T> {
  const unique = Array.from(new Set(addresses.filter(Boolean)));
  return {
    streams: unique.map((address) => ({
      address, nextPage: 1, buffer: [], exhausted: false,
    })),
    seenIds: [],
  };
}

const timeOf = (post: FollowingFeedPost) => {
  const t = new Date(post.created_at).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Runs `tasks` with at most `limit` in flight. */
async function runWithConcurrency(tasks: (() => Promise<void>)[], limit: number) {
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const task = tasks[next];
      next += 1;
      // eslint-disable-next-line no-await-in-loop
      await task();
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, tasks.length)) }, worker));
}

/**
 * Takes the next `pageSize` posts across all followed accounts, newest first.
 * Pure with respect to `state`: the input is not mutated and the returned
 * `nextState` is a fresh copy, so it can live in a react-query page param.
 * A stream whose request fails is dropped rather than failing the whole feed,
 * unless every request in a refill round fails while nothing has been emitted.
 */
export async function takeFollowingFeedPage<T extends FollowingFeedPost>(
  state: FollowingFeedState<T>,
  fetchPage: FetchAccountPosts<T>,
  { pageSize = FOLLOWING_FEED_PAGE_SIZE, concurrency = FOLLOWING_FEED_CONCURRENCY } = {},
): Promise<FollowingFeedPage<T>> {
  const streams = state.streams.map((s) => ({ ...s, buffer: [...s.buffer] }));
  const seen = new Set(state.seenIds);
  const items: T[] = [];

  const refill = async () => {
    const dry = streams
      .map((s, index) => index)
      .filter((index) => !streams[index].exhausted && streams[index].buffer.length === 0);
    if (dry.length === 0) return;
    let failures = 0;
    let lastError: unknown;
    await runWithConcurrency(dry.map((index) => async () => {
      const stream = streams[index];
      try {
        const res = await fetchPage(stream.address, stream.nextPage);
        const fetched = res.items || [];
        streams[index] = {
          ...stream,
          buffer: fetched.filter((p) => p?.id && !seen.has(String(p.id))),
          nextPage: stream.nextPage + 1,
          exhausted: !res.hasMore || fetched.length === 0,
        };
      } catch (error) {
        failures += 1;
        lastError = error;
        streams[index] = { ...stream, exhausted: true };
      }
    }), concurrency);
    if (failures === dry.length && items.length === 0 && state.seenIds.length === 0) {
      throw lastError instanceof Error ? lastError : new Error('Failed to load following feed');
    }
  };

  while (items.length < pageSize) {
    // Every live stream needs a buffered head before the newest one is known.
    // eslint-disable-next-line no-await-in-loop
    await refill();
    let best: AccountStream<T> | undefined;
    streams.forEach((s) => {
      if (s.buffer.length === 0) return;
      if (!best || timeOf(s.buffer[0]) > timeOf(best.buffer[0])) best = s;
    });
    if (!best) break;
    const post = best.buffer.shift()!;
    const id = String(post.id);
    if (!seen.has(id)) {
      seen.add(id);
      items.push(post);
    }
  }

  const drained = streams.every((s) => s.exhausted && s.buffer.length === 0);
  return {
    items,
    nextState: drained ? undefined : { streams, seenIds: Array.from(seen) },
  };
}
