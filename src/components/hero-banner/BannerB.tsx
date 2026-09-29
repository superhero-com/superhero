import React from 'react';
import { useTranslation } from 'react-i18next';
import { Hash } from 'lucide-react';
import BannerContent from './BannerContent';
import { TrendFeatureCard } from './HeroFeatureCards';

const BannerB = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<TrendFeatureCard />}
      eyebrow={t('bannerB.eyebrow')}
      title={t('bannerB.title')}
      accent={t('bannerB.titleAccent')}
      description={t('bannerB.description')}
      icon={Hash}
      primaryButtonText={t('bannerB.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerB.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerB;
