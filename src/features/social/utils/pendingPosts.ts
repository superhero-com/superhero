/**
 * Posts and replies published but not yet in the backend.
 *
 * Publishing waits for the chain, then shows the new post at once from a copy
 * built in the browser: the backend indexes it a while later. That copy used
 * to live only in the query cache, so a reload in between lost it until the
 * backend caught up. It is now kept in the pending-transactions store too,
 * and put back into every feed or thread that loads without it, until the
 * backend has the real one.
 */

import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { PostsService } from '@/api/generated';
import {
  listPendingTransactions,
  registerPendingTransactionResolver,
  trackPendingTransaction,
  type PendingTransaction,
  type PendingTransactionResolver,
} from '@/features/pending-transactions/store';

type Post = Record<string, any>;

/** Post ids as the v3 contract and the backend spell them. */
export const normalizePostId = (id: string): string => (
  String(id).endsWith('_v3') ? String(id) : `${String(id)}_v3`
);

const sameId = (a: unknown, b: unknown): boolean => (
  a != null && b != null && normalizePostId(String(a)) === normalizePostId(String(b))
);

// Live once the backend serves the post; until then the lookup 404s, which
// counts as "not yet".
const resolvePost: PendingTransactionResolver = async (transaction) => {
  const { postId } = transaction.meta;
  if (!postId) return undefined;
  const post = await PostsService.getById({ id: postId });
  return post ? { postId } : undefined;
};

registerPendingTransactionResolver('create_post', resolvePost);
registerPendingTransactionResolver('create_comment', resolvePost);

/** Keep a published post until the backend has it. */
export function trackPublishedPost({
  account, txHash, post, topic,
}: {
  account: string;
  txHash: string;
  post: Post;
  /** The hashtag feed it was posted to, lower case, if any. */
  topic?: string | null;
}): PendingTransaction {
  return trackPendingTransaction({
    kind: 'create_post',
    account,
    txHash,
    // The wallet already waited for it to be mined.
    step: 'confirmed',
    meta: {
      postId: String(post.id),
      post: JSON.stringify(post),
      topic: topic ? topic.toLowerCase() : null,
    },
  });
}

/** Keep a published reply until the backend has it. */
export function trackPublishedReply({
  account, txHash, parentId, reply,
}: {
  account: string;
  txHash: string;
  parentId: string;
  reply: Post;
}): PendingTransaction {
  return trackPendingTransaction({
    kind: 'create_comment',
    account,
    txHash,
    step: 'confirmed',
    meta: {
      postId: String(reply.id),
      parentId: normalizePostId(parentId),
      post: JSON.stringify(reply),
    },
  });
}

const parsePost = (transaction: PendingTransaction): Post | null => {
  try {
    const post = JSON.parse(transaction.meta.post ?? '');
    return post && typeof post === 'object' ? post : null;
  } catch {
    return null;
  }
};

const postsOf = (transactions: PendingTransaction[]): Post[] => (
  transactions.map(parsePost).filter((post): post is Post => post !== null)
);

/** Posts still waiting for the backend, newest first. */
export function pendingPosts(): Post[] {
  return postsOf(listPendingTransactions({ kind: 'create_post' }));
}

/** Replies to `parentId` still waiting for the backend, oldest first. */
export function pendingReplies(parentId: string): Post[] {
  return postsOf(listPendingTransactions({
    kind: 'create_comment',
    match: (transaction) => sameId(transaction.meta.parentId, parentId),
  })).reverse();
}

const isLatestFeedKey = (key: readonly unknown[]): boolean => (
  key[0] === 'posts' && (key[1] as any)?.sortBy === 'latest'
);

const isThreadKey = (key: readonly unknown[]): boolean => (
  key[0] === 'post-comments' || key[0] === 'comment-replies'
);

const isInThread = (key: readonly unknown[], parentId: string): boolean => (
  isThreadKey(key) && sameId(key[1], parentId)
);

const containsPost = (items: unknown, post: Post): boolean => (
  Array.isArray(items) && items.some((item: any) => item?.id === post.id
    || (post.tx_hash && item?.tx_hash === post.tx_hash))
);

/** Put `post` on top of one latest-posts feed, unless it is already there. */
export function prependToLatestFeed(
  queryClient: QueryClient,
  queryKey: QueryKey,
  post: Post,
): void {
  // Only the API's detected language can qualify a post for a filtered
  // cache. Untagged posts from the browser wait for the indexed refetch.
  const language = (queryKey as any[])[1]?.language;
  if (language && post.language !== language) return;
  queryClient.setQueryData(queryKey, (old: any) => {
    if (!old || !Array.isArray(old.pages)) {
      return {
        pages: [{ items: [post], meta: { currentPage: 1, totalPages: 1 } }],
        pageParams: [1],
      };
    }
    const firstPage = old.pages[0] || { items: [], meta: {} };
    if (containsPost(firstPage.items, post)) return old;
    return {
      ...old,
      pages: [{ ...firstPage, items: [post, ...(firstPage.items || [])] }, ...old.pages.slice(1)],
    };
  });
}

/** Put `post` on top of a hashtag feed, unless it is already there. */
export function prependToTopicFeed(queryClient: QueryClient, queryKey: QueryKey, post: Post): void {
  queryClient.setQueryData(queryKey, (old: any) => {
    const posts = Array.isArray(old?.posts) ? old.posts : [];
    if (containsPost(posts, post)) return old;
    return {
      ...(old || {}),
      posts: [post, ...posts],
      post_count: typeof old?.post_count === 'number' ? old.post_count + 1 : old?.post_count,
    };
  });
}

/** Default latest feed, filled even before it is first loaded. */
const DEFAULT_LATEST_FEED_KEY = ['posts', {
  limit: 10, sortBy: 'latest', search: '', filterBy: 'all',
}];

/** Show a new post in every latest-posts feed and in its hashtag feed. */
export function insertPostIntoFeeds(
  queryClient: QueryClient,
  post: Post,
  topic?: string | null,
): void {
  const keys = new Map<string, QueryKey>();
  queryClient.getQueryCache().findAll({ queryKey: ['posts'], exact: false })
    .filter((query) => isLatestFeedKey(query.queryKey))
    .forEach((query) => keys.set(JSON.stringify(query.queryKey), query.queryKey));
  if (!keys.has(JSON.stringify(DEFAULT_LATEST_FEED_KEY))) {
    keys.set(JSON.stringify(DEFAULT_LATEST_FEED_KEY), DEFAULT_LATEST_FEED_KEY);
  }
  keys.forEach((key) => prependToLatestFeed(queryClient, key, post));
  if (topic) prependToTopicFeed(queryClient, ['topic-by-name', topic.toLowerCase()], post);
}

/**
 * Add `reply` to one thread query, unless it is already there. Replies are
 * oldest first, so it goes at the end.
 */
export function appendToThread(queryClient: QueryClient, queryKey: QueryKey, reply: Post): void {
  const infinite = (queryKey as any[])[2] === 'infinite';
  queryClient.setQueryData(queryKey, (old: any) => {
    if (infinite) {
      if (!old || !Array.isArray(old.pages)) {
        return {
          pageParams: [1],
          pages: [{ items: [reply], meta: { currentPage: 1, totalPages: 1 } }],
        };
      }
      if (old.pages.some((page: any) => containsPost(page?.items, reply))) return old;
      const lastIndex = old.pages.length - 1;
      const lastPage = old.pages[lastIndex] || { items: [], meta: {} };
      return {
        ...old,
        pages: [
          ...old.pages.slice(0, lastIndex),
          { ...lastPage, items: [...(lastPage.items || []), reply] },
        ],
      };
    }
    if (!Array.isArray(old)) return [reply];
    return containsPost(old, reply) ? old : [...old, reply];
  });
}

/**
 * Show a new reply in every loaded thread of its parent, and in the usual
 * thread keys even before they are first loaded.
 */
export function insertReplyIntoThreads(
  queryClient: QueryClient,
  parentId: string,
  reply: Post,
): void {
  const normalized = normalizePostId(parentId);
  const keys = new Map<string, QueryKey>();
  queryClient.getQueryCache().getAll()
    .filter((query) => isInThread(query.queryKey, parentId))
    .forEach((query) => keys.set(JSON.stringify(query.queryKey), query.queryKey));
  [normalized, parentId].forEach((id) => {
    [['post-comments', id, 'infinite'], ['post-comments', id], ['comment-replies', id]]
      .forEach((key) => {
        if (!keys.has(JSON.stringify(key))) keys.set(JSON.stringify(key), key);
      });
  });
  keys.forEach((key) => appendToThread(queryClient, key, reply));
}

/** Put what is still pending back into one query that just loaded without it. */
function restoreInto(queryClient: QueryClient, queryKey: QueryKey): void {
  const key = queryKey as readonly unknown[];
  if (isLatestFeedKey(key)) {
    // Oldest first, so the newest ends up on top.
    pendingPosts().reverse().forEach((post) => prependToLatestFeed(queryClient, queryKey, post));
  } else if (key[0] === 'topic-by-name' && typeof key[1] === 'string') {
    const topic = key[1].toLowerCase();
    listPendingTransactions({ kind: 'create_post', match: (transaction) => transaction.meta.topic === topic })
      .reverse()
      .forEach((transaction) => {
        const post = parsePost(transaction);
        if (post) prependToTopicFeed(queryClient, queryKey, post);
      });
  } else if (isThreadKey(key) && typeof key[1] === 'string') {
    pendingReplies(key[1]).forEach((reply) => appendToThread(queryClient, queryKey, reply));
  }
}

/** The post or reply `id` as built in the browser, while the backend lacks it. */
export function pendingPostById(id: string): Post | null {
  const [transaction] = listPendingTransactions({
    kind: ['create_post', 'create_comment'],
    match: (entry) => sameId(entry.meta.postId, id),
  });
  return transaction ? parsePost(transaction) : null;
}

const isPostDetailKey = (key: readonly unknown[]): key is readonly ['post', string, ...unknown[]] => (
  key[0] === 'post' && typeof key[1] === 'string'
);

/**
 * Keep pending posts and replies in view: whenever a feed or thread loads from
 * the backend without them (after a reload, or a refetch before the indexer
 * caught up), put them back; and when a pending post's own page or its replies
 * fail to load (the backend 404s both until it has the post), show the copy
 * built in the browser and its pending replies instead. Returns the
 * unsubscribe.
 */
export function watchPendingPosts(queryClient: QueryClient): () => void {
  const cache = queryClient.getQueryCache();
  cache.getAll()
    .filter((query) => query.state.data !== undefined)
    .forEach((query) => restoreInto(queryClient, query.queryKey));
  return cache.subscribe((event) => {
    if (event.type !== 'updated') return;
    const key = event.query.queryKey as readonly unknown[];
    if (event.action.type === 'error') {
      const id = typeof key[1] === 'string' ? key[1] : null;
      if (!id || !pendingPostById(id)) return;
      if (isPostDetailKey(key)) {
        queryClient.setQueryData(event.query.queryKey, pendingPostById(id));
      } else if (isThreadKey(key)) {
        // Its replies 404 too until the backend has it: none yet, but
        // the pending ones.
        const replies = pendingReplies(id);
        const page = { items: replies, meta: { currentPage: 1, totalPages: 1 } };
        queryClient.setQueryData(
          event.query.queryKey,
          key[2] === 'infinite' ? { pages: [page], pageParams: [1] } : replies,
        );
      }
      return;
    }
    // Only fetches: `setQueryData` (ours included) is marked manual.
    if (event.action.type !== 'success' || event.action.manual) return;
    restoreInto(queryClient, event.query.queryKey);
  });
}

/** Once the backend has it (or it is given up on), load the real thing. */
export function refreshAfterPostSettled(
  queryClient: QueryClient,
  transaction: PendingTransaction,
): void {
  queryClient.invalidateQueries({ queryKey: ['posts'], exact: false });
  // Its own page, if it is open on the copy from the browser.
  const { postId } = transaction.meta;
  queryClient.invalidateQueries({
    predicate: (query) => isPostDetailKey(query.queryKey) && sameId(query.queryKey[1], postId),
  });
  if (transaction.kind === 'create_post') {
    if (transaction.meta.topic) {
      queryClient.invalidateQueries({ queryKey: ['topic-by-name', transaction.meta.topic] });
    }
    return;
  }
  const parentId = transaction.meta.parentId ?? '';
  queryClient.invalidateQueries({ predicate: (query) => isInThread(query.queryKey, parentId) });
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === 'post' && sameId(query.queryKey[1], parentId),
  });
  queryClient.invalidateQueries({ queryKey: ['post-desc-count'], exact: false });
}
