import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const COLLECTIONS = [
  {
    label: 'English', tag: '#Bitcoin', flag: '🇬🇧', collection: 'WORDS', lang: 'en',
  },
  {
    label: '中文', tag: '#比特币', flag: '🇨🇳', collection: 'CHINESE', lang: 'zh',
  },
  {
    label: 'Русский', tag: '#Биткоин', flag: '🇷🇺', collection: 'RUSSIAN', lang: 'ru',
  },
  {
    label: 'العربية', tag: '#بيتكوين', flag: '🇸🇦', collection: 'ARABIC', lang: 'ar',
  },
];

const LanguageCollectionLinks = () => {
  const { t } = useTranslation('banners');
  return (
    <nav className="hero-carousel__collections" aria-label={t('bannerLanguages.collectionsLabel')}>
      {COLLECTIONS.map(({
        label, tag, flag, collection, lang,
      }) => (
        <Link
          key={collection}
          to={`/trends/tokens?collection=${collection}`}
          className="hero-collection"
        >
          <span className="hero-collection__flag" aria-hidden="true">{flag}</span>
          <span className="hero-collection__text" lang={lang} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <strong>{tag}</strong>
            {' '}
            <span>{label}</span>
          </span>
          <ArrowUpRight className="hero-collection__arrow" aria-hidden="true" />
        </Link>
      ))}
    </nav>
  );
};

export default LanguageCollectionLinks;
