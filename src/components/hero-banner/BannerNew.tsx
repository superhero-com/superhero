import React from 'react';
import { useTranslation } from 'react-i18next';
import { Diamond } from 'lucide-react';
import BannerContent from './BannerContent';
import { AppFeatureCard } from './HeroFeatureCards';

const BannerNew = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<AppFeatureCard />}
      eyebrow={t('bannerNew.eyebrow')}
      title={t('bannerNew.title')}
      accent={t('bannerNew.titleAccent')}
      description={t('bannerNew.description')}
      icon={Diamond}
      primaryButtonText={t('bannerNew.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerNew.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerNew;
