import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2 } from 'lucide-react';
import artwork from '../../assets/hero/languages.webp';
import BannerContent from './BannerContent';

const BannerLanguages = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerLanguages.eyebrow')}
      title={t('bannerLanguages.title')}
      accent={t('bannerLanguages.titleAccent')}
      description={t('bannerLanguages.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--languages"
      icon={Globe2}
      primaryButtonText={t('bannerLanguages.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerLanguages.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerLanguages;
