import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
        ...en,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'translation',
    ns: ['translation', ...Object.keys(en)],
    interpolation: { escapeValue: false },
  });

export default i18n;
