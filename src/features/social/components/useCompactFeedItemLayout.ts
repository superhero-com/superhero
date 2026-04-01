import {
  useEffect, useLayoutEffect, useRef, useState,
} from 'react';

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function useCompactFeedItemLayout(threshold: number) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [isCompact, setIsCompact] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return () => {};

    const update = (width: number) => {
      setIsCompact(width > 0 && width < threshold);
    };

    update(node.getBoundingClientRect().width);

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver((entries) => {
        update(entries[0]?.contentRect.width ?? node.getBoundingClientRect().width);
      });
      observer.observe(node);
      return () => observer.disconnect();
    }

    const handleResize = () => update(node.getBoundingClientRect().width);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [threshold]);

  return { containerRef, isCompact };
}
