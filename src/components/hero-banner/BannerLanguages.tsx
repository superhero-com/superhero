import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import BannerContent from './BannerContent';

// Each language card links to /trends/tokens?collection=<NAME>
// Collection names match the on-chain collection IDs (WORDS=English, etc.)
const LANGUAGE_SAMPLES = [
  {
    flag: '🇬🇧',
    tag: '#Bitcoin',
    label: 'English',
    collection: 'WORDS',
  },
  {
    flag: '🇨🇳',
    tag: '#比特币',
    label: '中文',
    collection: 'CHINESE',
  },
  {
    flag: '🇷🇺',
    tag: '#Биткоин',
    label: 'Русский',
    collection: 'RUSSIAN',
  },
  {
    flag: '🇸🇦',
    tag: '#بيتكوين',
    label: 'العربية',
    collection: 'ARABIC',
    rtl: true,
  },
];

const LanguagesGraphic = () => (
  <div className="banner-languages-graphic">
    <div className="language-showcase">
      {LANGUAGE_SAMPLES.map(({
        flag, tag, label, collection, rtl,
      }) => (
        <Link
          key={collection}
          to={`/trends/tokens?collection=${collection}`}
          className="language-item language-item--clickable"
          title={`Browse ${label} trends`}
          style={{ textDecoration: 'none', cursor: 'pointer' }}
        >
          <span className="language-flag">{flag}</span>
          <span className="language-sample" dir={rtl ? 'rtl' : 'ltr'}>{tag}</span>
          <span className="language-label">{label}</span>
        </Link>
      ))}
    </div>
  </div>
);

const BannerLanguages = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      title={t('bannerLanguages.title')}
      description={t('bannerLanguages.description')}
      graphic={<LanguagesGraphic />}
      primaryButtonText={t('bannerLanguages.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerLanguages.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerLanguages;
