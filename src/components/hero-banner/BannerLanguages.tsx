import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';

// Graphic showing the same #trend in several languages
const LANGUAGE_SAMPLES = [
  { flag: '🇬🇧', tag: '#Bitcoin' },
  { flag: '🇨🇳', tag: '#比特币' },
  { flag: '🇷🇺', tag: '#Биткоин' },
  { flag: '🇸🇦', tag: '#بيتكوين', rtl: true },
];

const LanguagesGraphic = () => (
  <div className="banner-languages-graphic">
    <div className="language-showcase">
      {LANGUAGE_SAMPLES.map(({ flag, tag, rtl }) => (
        <div className="language-item" key={tag}>
          <span className="language-flag">{flag}</span>
          <span className="language-sample" dir={rtl ? 'rtl' : 'ltr'}>{tag}</span>
        </div>
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
