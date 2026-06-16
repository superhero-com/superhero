import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ar from './locales/ar.json';

const LOCALES = {
  en, zh, fr, de, ar,
} as const;

export type LanguageCode = keyof typeof LOCALES;

export const SUPPORTED_LANGUAGES: {
  code: LanguageCode;
  label: string;
  flag: string;
}[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  // Arabic is translated and registered, but hidden from the switcher for now.
  // Re-enable by uncommenting (RTL handling is already wired via RTL_LANGUAGES).
  // { code: 'ar', label: 'العربية', flag: '🇸🇦' },
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
