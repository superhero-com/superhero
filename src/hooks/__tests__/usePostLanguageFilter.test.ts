import { renderHook, act } from '@testing-library/react';
import {
  describe, expect, it, beforeEach, afterEach, vi,
} from 'vitest';
import i18n, { changeLanguage } from '@/i18n';
import { usePostLanguageFilter } from '../usePostLanguageFilter';

const STORAGE_KEY = 'postLanguageFilter';

describe('usePostLanguageFilter', () => {
  beforeEach(async () => {
    await changeLanguage('en');
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
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

  it('shares the preference across simultaneous Home and Explore consumers and remounts', () => {
    const home = renderHook(() => usePostLanguageFilter());
    const explore = renderHook(() => usePostLanguageFilter());
    act(() => home.result.current.setFilter('ru'));
    expect(explore.result.current.filter).toBe('ru');
    home.unmount();
    explore.unmount();
    expect(renderHook(() => usePostLanguageFilter()).result.current.filter).toBe('ru');
  });

  it('resets All on UI changes and does not resurrect it after switching back', async () => {
    const { result } = renderHook(() => usePostLanguageFilter());
    act(() => result.current.setFilter('all'));
    await act(() => changeLanguage('ar'));
    expect(result.current.languageParam).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');
    await act(() => changeLanguage('en'));
    expect(result.current.languageParam).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('resets the preference on UI changes even while feeds are unmounted', async () => {
    const home = renderHook(() => usePostLanguageFilter());
    act(() => home.result.current.setFilter('all'));
    home.unmount();
    await changeLanguage('zh');
    await changeLanguage('en');
    expect(renderHook(() => usePostLanguageFilter()).result.current.filter).toBe('en');
  });

  it('receives preference changes and clears from another browser tab', () => {
    const { result } = renderHook(() => usePostLanguageFilter());
    act(() => window.dispatchEvent(new StorageEvent('storage', {
      key: STORAGE_KEY, newValue: JSON.stringify({ ui: 'en', filter: 'all' }),
    })));
    expect(result.current.languageParam).toBeUndefined();
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: null })));
    expect(result.current.languageParam).toBe('en');
  });

  it('updates shared in-memory state when storage reads and writes are blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
    const home = renderHook(() => usePostLanguageFilter());
    const explore = renderHook(() => usePostLanguageFilter());
    act(() => home.result.current.setFilter('zh'));
    expect(explore.result.current.languageParam).toBe('zh');
    expect(i18n.language).toBe('en');
  });

  it('retains a session preference across navigation when writes fail but reads work', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'en', filter: 'en' }));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Full'); });
    const home = renderHook(() => usePostLanguageFilter());
    act(() => home.result.current.setFilter('all'));
    home.unmount();
    expect(renderHook(() => usePostLanguageFilter()).result.current.filter).toBe('all');
  });

  it.each(['de', 'fr', 'und', '__proto__'])('ignores unsupported stored filter %s', (filter) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui: 'en', filter }));
    expect(renderHook(() => usePostLanguageFilter()).result.current.languageParam).toBe('en');
  });
});
