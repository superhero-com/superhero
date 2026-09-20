import { useCallback } from 'react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useTranslation } from 'react-i18next';
import i18n, { toSupportedLanguage, type LanguageCode } from '@/i18n';

export type PostLanguageFilter = 'all' | LanguageCode;
type StoredPreference = { ui: LanguageCode; filter: PostLanguageFilter };
const STORAGE_KEY = 'postLanguageFilter';
const listeners = new Set<(value: StoredPreference | null) => void>();
let memoryPreference: StoredPreference | null = null;
let memoryOnly = false;

function parsePreference(raw: string | null): StoredPreference | null {
  try {
    const value = JSON.parse(raw || 'null');
    if (value && toSupportedLanguage(value.ui) === value.ui
      && (value.filter === 'all' || toSupportedLanguage(value.filter) === value.filter)) {
      return { ui: value.ui, filter: value.filter };
    }
  } catch {
    // Invalid stored preferences fall back to the UI language.
  }
  return null;
}

function writePreference(value: StoredPreference | null) {
  memoryPreference = value;
  try {
    if (value) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    else localStorage.removeItem(STORAGE_KEY);
    memoryOnly = false;
  } catch {
    memoryOnly = true;
    // Keep the preference in memory when storage is unavailable.
  }
  listeners.forEach((listener) => listener(value));
}

// A UI-language change starts a fresh content preference, including when neither
// feed is mounted. Switching back must not resurrect an old "All languages" choice.
let previousUi = toSupportedLanguage(i18n.resolvedLanguage || i18n.language);
i18n.on('languageChanged', (language) => {
  const ui = toSupportedLanguage(language);
  if (ui !== previousUi) {
    previousUi = ui;
    writePreference({ ui, filter: ui });
  }
});

const preferenceAtom = atomWithStorage<StoredPreference | null>(STORAGE_KEY, null, {
  getItem: () => {
    if (memoryOnly) return memoryPreference;
    try {
      return parsePreference(localStorage.getItem(STORAGE_KEY));
    } catch {
      return memoryPreference;
    }
  },
  setItem: (_, value) => writePreference(value),
  removeItem: () => writePreference(null),
  subscribe: (_, callback) => {
    listeners.add(callback);
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        memoryOnly = false;
        memoryPreference = parsePreference(event.newValue);
        callback(memoryPreference);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener('storage', onStorage);
    };
  },
}, { getOnInit: true });

/** Shared by Home and Explore. All languages never changes the interface locale. */
export function usePostLanguageFilter() {
  const { i18n: activeI18n } = useTranslation();
  const uiLanguage = toSupportedLanguage(activeI18n.resolvedLanguage || activeI18n.language);
  const [stored, setStored] = useAtom(preferenceAtom);
  const filter = stored?.ui === uiLanguage ? stored.filter : uiLanguage;
  const setFilter = useCallback((value: PostLanguageFilter) => {
    setStored({ ui: uiLanguage, filter: value });
  }, [uiLanguage, setStored]);

  return {
    filter, setFilter, languageParam: filter === 'all' ? undefined : filter, uiLanguage,
  };
}
