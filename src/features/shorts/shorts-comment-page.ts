import { request } from './api';

export type ShortComment = { id: string; author: string; text: string; height: string; sequence: string };
export type CommentPage = { items: ShortComment[]; version: string; next: string | null; total: string };
export type PublishedComment = { videoId: string; author: string; sequence: string; tx: string };
export const matchesPublishedComment = (comment: ShortComment, published: PublishedComment) => (
  comment.author === published.author && comment.sequence === published.sequence
);
export const mergeComments = (items: ShortComment[], more: ShortComment[]) => (
  [...new Map([...items, ...more].map((comment) => [comment.id, comment])).values()]
);

/** Find the exact newly mined comment without changing the user's sort or paging cursor. */
export async function loadCommentPage(id: string, signal: AbortSignal, published?: PublishedComment) {
  const path = `/${encodeURIComponent(id)}/comments`;
  const page = await request<CommentPage>(path, undefined, undefined, { signal, timeout: 20000 });
  if (!published || page.items.some((item) => matchesPublishedComment(item, published))) return page;
  // New comments append to the contract's dense slots. Start at the end; work
  // backwards if concurrent comments have pushed this one onto an earlier page.
  let cursor = BigInt(page.total) > 25n ? BigInt(page.total) - 25n : 0n;
  while (cursor > 0n && !signal.aborted) {
    // Each page determines whether another read is needed; stop immediately on a match.
    // eslint-disable-next-line no-await-in-loop
    const next = await request<CommentPage>(`${path}?cursor=${cursor}&version=${encodeURIComponent(page.version)}`, undefined, undefined, { signal, timeout: 20000 });
    const match = next.items.find((item) => matchesPublishedComment(item, published));
    if (match) return { ...page, items: mergeComments(page.items, [match]) };
    cursor = cursor > 25n ? cursor - 25n : 0n;
  }
  return page;
}
