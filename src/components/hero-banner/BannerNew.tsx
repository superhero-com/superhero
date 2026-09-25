import React from 'react';
import { useTranslation } from 'react-i18next';
import { Diamond } from 'lucide-react';
import artwork from '../../assets/hero/app.webp';
import BannerContent from './BannerContent';

const BannerNew = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerNew.eyebrow')}
      title={t('bannerNew.title')}
      accent={t('bannerNew.titleAccent')}
      description={t('bannerNew.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--app"
      icon={Diamond}
      primaryButtonText={t('bannerNew.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerNew.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerNew;
