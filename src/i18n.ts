import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import common from './locales/en/common.json';
import navigation from './locales/en/navigation.json';
import dex from './locales/en/dex.json';
import social from './locales/en/social.json';
import governance from './locales/en/governance.json';
import trending from './locales/en/trending.json';
import errors from './locales/en/errors.json';
import landing from './locales/en/landing.json';
import forms from './locales/en/forms.json';
import transactions from './locales/en/transactions.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common,
        navigation,
        dex,
        social,
        governance,
        trending,
        errors,
        landing,
        forms,
        transactions,
      },
    },
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'navigation', 'dex', 'social', 'governance', 'trending', 'errors', 'landing', 'forms', 'transactions'],
    // Plugin namespaces will be added dynamically when plugins load
    interpolation: { escapeValue: false },
  });

export default i18n;


