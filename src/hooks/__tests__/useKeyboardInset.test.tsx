// @vitest-environment jsdom
//
// The measurement the send sheet is positioned from. It has to tell a keyboard
// apart from the browser chrome that collapses on every scroll, or a modal would
// hop by ~60px whenever the URL bar hides — and it has to report the height left
// over, because the caller cannot get that from `100vh`.
import { act, renderHook } from '@testing-library/react';
import {
  afterEach, describe, expect, it,
} from 'vitest';

import { useKeyboardInset } from '../useKeyboardInset';

const LAYOUT_HEIGHT = 800;

interface FakeViewport {
  height: number;
  offsetTop: number;
  addEventListener: (type: string, fn: () => void) => void;
  removeEventListener: (type: string, fn: () => void) => void;
  emit: (type: string) => void;
}

const listeners = new Map<string, Set<() => void>>();

const installViewport = (height: number, offsetTop = 0): FakeViewport => {
  listeners.clear();
  const viewport: FakeViewport = {
    height,
    offsetTop,
    addEventListener: (type, fn) => {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener: (type, fn) => { listeners.get(type)?.delete(fn); },
    emit: (type) => { listeners.get(type)?.forEach((fn) => fn()); },
  };
  Object.defineProperty(window, 'visualViewport', {
    value: viewport, configurable: true, writable: true,
  });
  Object.defineProperty(window, 'innerHeight', {
    value: LAYOUT_HEIGHT, configurable: true, writable: true,
  });
  return viewport;
};

afterEach(() => {
  Object.defineProperty(window, 'visualViewport', {
    value: undefined, configurable: true, writable: true,
  });
});

describe('useKeyboardInset', () => {
  it('is zero with no keyboard up', () => {
    installViewport(LAYOUT_HEIGHT);
    expect(renderHook(() => useKeyboardInset()).result.current)
      .toEqual({ inset: 0, visibleHeight: 0 });
  });

  it('reports the covered height once a keyboard opens', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      viewport.height = 460; // a 340px keyboard
      viewport.emit('resize');
    });

    // The pair a caller needs: how far to lift, and how much room is left.
    expect(result.current).toEqual({ inset: 340, visibleHeight: 460 });
  });

  it('ignores browser chrome collapsing, which is not a keyboard', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      viewport.height = LAYOUT_HEIGHT - 64; // URL bar hiding on scroll
      viewport.emit('resize');
    });

    expect(result.current).toEqual({ inset: 0, visibleHeight: 0 });
  });

  it('discounts the part already scrolled out of view', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => {
      viewport.height = 460;
      viewport.offsetTop = 100; // visual viewport panned down
      viewport.emit('scroll');
    });

    expect(result.current).toEqual({ inset: 240, visibleHeight: 460 });
  });

  it('returns to zero when the keyboard closes', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => { viewport.height = 460; viewport.emit('resize'); });
    expect(result.current.inset).toBe(340);

    act(() => { viewport.height = LAYOUT_HEIGHT; viewport.emit('resize'); });
    expect(result.current).toEqual({ inset: 0, visibleHeight: 0 });
  });

  it('stays at zero where visualViewport does not exist', () => {
    Object.defineProperty(window, 'visualViewport', {
      value: undefined, configurable: true, writable: true,
    });
    expect(renderHook(() => useKeyboardInset()).result.current)
      .toEqual({ inset: 0, visibleHeight: 0 });
  });

  it('holds the same object while nothing moves, so scrolling re-renders nobody', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { result } = renderHook(() => useKeyboardInset());

    act(() => { viewport.height = 460; viewport.emit('resize'); });
    const afterOpen = result.current;

    act(() => { viewport.emit('scroll'); });
    expect(result.current).toBe(afterOpen);
  });

  it('drops its listeners on unmount', () => {
    const viewport = installViewport(LAYOUT_HEIGHT);
    const { unmount } = renderHook(() => useKeyboardInset());
    expect(listeners.get('resize')?.size).toBe(1);

    unmount();
    expect(listeners.get('resize')?.size).toBe(0);
    expect(viewport).toBeDefined();
  });
});
