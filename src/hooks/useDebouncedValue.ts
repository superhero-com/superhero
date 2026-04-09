import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stayed unchanged for `delayMs`.
 * Cancels pending updates when `value` changes again (standard debounce).
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Debounced **trimmed** search string. Non-empty queries wait `delayMs` after typing stops;
 * clearing the field resets immediately so callers do not keep fetching or show stale results.
 */
export function useDebouncedTrimmedSearch(input: string, delayMs: number): string {
  const [q, setQ] = useState('');

  useEffect(() => {
    const t = input.trim();
    if (!t) {
      setQ('');
      return undefined;
    }
    const id = window.setTimeout(() => setQ(t), delayMs);
    return () => window.clearTimeout(id);
  }, [input, delayMs]);

  return q;
}
