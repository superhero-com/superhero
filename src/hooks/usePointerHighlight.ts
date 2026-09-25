import {
  useCallback, useEffect, useRef, type PointerEvent,
} from 'react';

/** Moves a decorative CSS highlight without rendering on pointer movement. */
export function usePointerHighlight() {
  const media = useRef<MediaQueryList | null>(null);
  const pending = useRef<{
    element: HTMLElement;
    x: number;
    y: number;
    frame: number | null;
  } | null>(null);

  const reset = useCallback(() => {
    const { current } = pending;
    if (!current) return;
    if (current.frame !== null) window.cancelAnimationFrame(current.frame);
    current.element.style.removeProperty('--card-pointer-x');
    current.element.style.removeProperty('--card-pointer-y');
    pending.current = null;
  }, []);

  useEffect(() => {
    const query = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)',
    );
    media.current = query;
    query.addEventListener('change', reset);
    window.addEventListener('blur', reset);
    return () => {
      reset();
      media.current = null;
      query.removeEventListener('change', reset);
      window.removeEventListener('blur', reset);
    };
  }, [reset]);

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch' || !media.current?.matches) return;
    if (pending.current?.element !== event.currentTarget) reset();
    const current = pending.current ?? {
      element: event.currentTarget, x: 0, y: 0, frame: null,
    };
    current.x = event.clientX;
    current.y = event.clientY;
    pending.current = current;
    if (current.frame !== null) return;

    current.frame = window.requestAnimationFrame(() => {
      current.frame = null;
      const rect = current.element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(100, Math.max(0, ((current.x - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((current.y - rect.top) / rect.height) * 100));
      current.element.style.setProperty('--card-pointer-x', `${x}%`);
      current.element.style.setProperty('--card-pointer-y', `${y}%`);
    });
  }, [reset]);

  return { onPointerMove, onPointerLeave: reset, onPointerCancel: reset };
}
