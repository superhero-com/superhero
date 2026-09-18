import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ar from './locales/ar.json';
import ru from './locales/ru.json';

const LOCALES = {
  en, zh, ar, ru,
} as const;

export type LanguageCode = keyof typeof LOCALES;

// The four language/script experiences the product supports, shown in the
// switcher in the client's stated order. Each label is written in its own
// script so the choice reads as a script choice, not only a locale code.
export const SUPPORTED_LANGUAGES: {
  code: LanguageCode;
  label: string;
  flag: string;
}[] = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

// Languages that should render right-to-left.
export const RTL_LANGUAGES: LanguageCode[] = ['ar'];

const LANGUAGE_STORAGE_KEY = 'lng';

// i18next resources: keep the original shape — the whole file as the default
// `translation` namespace, plus each top-level key spread as its own namespace.
const resources = Object.fromEntries(
  Object.entries(LOCALES).map(([code, data]) => [
    code,
    { translation: data, ...data },
  ]),
);

function isSupported(code: string): code is LanguageCode {
  return code in LOCALES;
}

function detectInitialLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && isSupported(saved)) return saved;
  } catch {
    // localStorage may be unavailable (SSR / privacy mode) — fall through.
  }
  try {
    const nav = (navigator.language || 'en').slice(0, 2).toLowerCase();
    if (isSupported(nav)) return nav;
  } catch {
    // navigator may be unavailable — fall through.
  }
  return 'en';
}

// Reflect language + direction on <html> so RTL languages (Arabic) lay out
// correctly and CSS `dir`-based rules apply.
function applyDocumentLanguage(code: string) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.lang = code;
  root.dir = RTL_LANGUAGES.includes(code as LanguageCode) ? 'rtl' : 'ltr';
}

const initialLanguage = detectInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: 'en',
  defaultNS: 'translation',
  ns: ['translation', ...Object.keys(en)],
  interpolation: { escapeValue: false },
});

applyDocumentLanguage(initialLanguage);
i18n.on('languageChanged', applyDocumentLanguage);

/** Change the active language and persist the choice. */
export function changeLanguage(code: LanguageCode): Promise<unknown> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    // Persisting is best-effort; ignore storage failures.
  }
  return i18n.changeLanguage(code);
}

export default i18n;
