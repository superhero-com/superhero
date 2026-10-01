import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users } from 'lucide-react';
import BannerContent from './BannerContent';
import { CommunityFeatureCard } from './HeroFeatureCards';

const BannerC = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<CommunityFeatureCard />}
      eyebrow={t('bannerC.eyebrow')}
      title={t('bannerC.title')}
      accent={t('bannerC.titleAccent')}
      description={t('bannerC.description')}
      icon={Users}
      primaryButtonText={t('bannerC.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerC.secondaryButton')}
      secondaryButtonLink="/trends/daos"
    />
  );
};

export default BannerC;
