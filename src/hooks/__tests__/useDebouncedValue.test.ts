import { renderHook, act } from '@testing-library/react';
import {
  describe, expect, it, vi, beforeEach, afterEach,
} from 'vitest';
import { useDebouncedValue, useDebouncedTrimmedSearch } from '../useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates only after delay when value stabilizes', () => {
    const { result, rerender } = renderHook(
      ({ v, d }: { v: string; d: number }) => useDebouncedValue(v, d),
      { initialProps: { v: 'a', d: 300 } },
    );

    expect(result.current).toBe('a');

    rerender({ v: 'ab', d: 300 });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('resets timer when value changes again before delay elapses', () => {
    const { result, rerender } = renderHook(
      ({ v }: { v: string }) => useDebouncedValue(v, 200),
      { initialProps: { v: 'x' } },
    );

    rerender({ v: 'y' });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    rerender({ v: 'z' });
    act(() => {
      vi.advanceTimersByTime(199);
    });
    expect(result.current).toBe('x');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('z');
  });
});

describe('useDebouncedTrimmedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces non-empty trimmed input', () => {
    const { result, rerender } = renderHook(
      ({ input }: { input: string }) => useDebouncedTrimmedSearch(input, 250),
      { initialProps: { input: '' } },
    );

    expect(result.current).toBe('');

    rerender({ input: '  hello  ' });
    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(result.current).toBe('hello');
  });

  it('clears immediately when input becomes empty or whitespace-only', () => {
    const { result, rerender } = renderHook(
      ({ input }: { input: string }) => useDebouncedTrimmedSearch(input, 400),
      { initialProps: { input: 'typed' } },
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe('typed');

    rerender({ input: '' });
    expect(result.current).toBe('');

    rerender({ input: '   ' });
    expect(result.current).toBe('');
  });
});
