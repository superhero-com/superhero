import { useEffect, useState } from 'react';

/**
 * Calls `onLoadMore` once the element given the returned ref comes within
 * `rootMargin` of the viewport, so the next page starts loading before the
 * reader hits the end. Keep a "Load more" button inside that element as the
 * fallback for browsers without IntersectionObserver.
 *
 * Pass `enabled = hasNextPage && !isFetching`: flipping it back on after each
 * page recreates the observer, which fires again while the element is still in
 * range — that keeps a tall viewport filling until it scrolls out of range.
 */
export function useLoadMoreSentinel(
  onLoadMore: () => void,
  enabled: boolean,
  rootMargin = '600px 0px',
) {
  const [sentinel, setSentinel] = useState<Element | null>(null);

  useEffect(() => {
    if (!enabled || !sentinel || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) onLoadMore();
    }, { rootMargin });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, onLoadMore, rootMargin, sentinel]);

  return setSentinel;
}
