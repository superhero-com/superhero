import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import artwork from '../../assets/hero/community.webp';
import BannerContent from './BannerContent';

const BannerC = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerC.eyebrow')}
      title={t('bannerC.title')}
      accent={t('bannerC.titleAccent')}
      description={t('bannerC.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--community"
      icon={Users}
      primaryButtonText={t('bannerC.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerC.secondaryButton')}
      secondaryButtonLink="/trends/daos"
    />
  );
};

export default BannerC;
