import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n';

// One content-language preference shared by home and Explore. `all` clears the
// filter without touching the UI language.
export type PostLanguageFilter = 'all' | LanguageCode;

const STORAGE_KEY = 'postLanguageFilter';

const SUPPORTED_CODES = SUPPORTED_LANGUAGES.map((l) => l.code) as string[];

function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === 'string' && SUPPORTED_CODES.includes(value);
}

function isFilterValue(value: unknown): value is PostLanguageFilter {
  return value === 'all' || isLanguageCode(value);
}

type StoredPreference = { ui: LanguageCode; filter: PostLanguageFilter };

function readStored(): StoredPreference | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && isLanguageCode(parsed.ui) && isFilterValue(parsed.filter)) {
      return { ui: parsed.ui, filter: parsed.filter };
    }
  } catch {
    // Corrupt or unavailable storage — fall back to the UI-language default.
  }
  return null;
}

// The UI language is one of the supported script codes; be defensive about
// region-tagged values (`en-US`) just in case.
function toSupportedUi(language: string): LanguageCode {
  const base = (language || 'en').slice(0, 2).toLowerCase();
  return isLanguageCode(base) ? base : 'en';
}

/**
 * Resolves the active post-language filter. By default it follows the selected
 * UI language; a filter the user set on the current UI language wins, and
 * changing the UI language resets the filter to that language with no extra
 * write. Clearing the filter to `all` keeps the UI language untouched.
 */
export function usePostLanguageFilter() {
  const { i18n } = useTranslation();
  const uiLanguage = toSupportedUi(i18n.resolvedLanguage || i18n.language);
  const [stored, setStored] = useState<StoredPreference | null>(() => readStored());

  const filter: PostLanguageFilter = stored && stored.ui === uiLanguage
    ? stored.filter
    : uiLanguage;

  const setFilter = useCallback((value: PostLanguageFilter) => {
    const next: StoredPreference = { ui: uiLanguage, filter: value };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Persisting is best-effort; ignore storage failures.
    }
    setStored(next);
  }, [uiLanguage]);

  // Only sent to the API when a specific language is chosen; `all` sends nothing.
  const languageParam = filter === 'all' ? undefined : filter;

  return {
    filter, setFilter, languageParam, uiLanguage,
  };
}
