import { renderHook, act } from '@testing-library/react';
import {
  describe, expect, it, beforeEach,
} from 'vitest';
import { usePostLanguageFilter } from '../usePostLanguageFilter';

const STORAGE_KEY = 'postLanguageFilter';

describe('usePostLanguageFilter', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to following the UI language (en) with a matching API param', () => {
    const { result } = renderHook(() => usePostLanguageFilter());
    expect(result.current.uiLanguage).toBe('en');
    expect(result.current.filter).toBe('en');
    expect(result.current.languageParam).toBe('en');
  });

  it('applies a stored filter set on the current UI language', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ui: 'en', filter: 'zh' }),
    );
    const { result } = renderHook(() => usePostLanguageFilter());
    expect(result.current.filter).toBe('zh');
    expect(result.current.languageParam).toBe('zh');
  });

  it('ignores a stored filter set on a different UI language (resets to UI default)', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ui: 'zh', filter: 'ar' }),
    );
    const { result } = renderHook(() => usePostLanguageFilter());
    // UI is 'en' but the stored preference was made under 'zh', so it is dropped.
    expect(result.current.filter).toBe('en');
    expect(result.current.languageParam).toBe('en');
  });

  it('clearing to "all" keeps the UI language and sends no API param', () => {
    const { result } = renderHook(() => usePostLanguageFilter());
    act(() => result.current.setFilter('all'));
    expect(result.current.filter).toBe('all');
    expect(result.current.languageParam).toBeUndefined();
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(stored).toEqual({ ui: 'en', filter: 'all' });
  });

  it('persists a chosen language against the current UI language', () => {
    const { result } = renderHook(() => usePostLanguageFilter());
    act(() => result.current.setFilter('ru'));
    expect(result.current.filter).toBe('ru');
    expect(result.current.languageParam).toBe('ru');
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) as string);
    expect(stored).toEqual({ ui: 'en', filter: 'ru' });
  });

  it('falls back to the UI default when stored JSON is corrupt', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    const { result } = renderHook(() => usePostLanguageFilter());
    expect(result.current.filter).toBe('en');
  });
});
