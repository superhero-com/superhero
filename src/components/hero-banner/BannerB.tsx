import React from 'react';
import { useTranslation } from 'react-i18next';
import { Hash } from 'lucide-react';
import artwork from '../../assets/hero/trends.webp';
import BannerContent from './BannerContent';

const BannerB = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerB.eyebrow')}
      title={t('bannerB.title')}
      accent={t('bannerB.titleAccent')}
      description={t('bannerB.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--trends"
      icon={Hash}
      priority
      primaryButtonText={t('bannerB.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerB.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerB;
