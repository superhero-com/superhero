import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import BannerContent from './BannerContent';
import { AgentFeatureCard } from './HeroFeatureCards';

const BannerD = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<AgentFeatureCard />}
      eyebrow={t('bannerD.eyebrow')}
      title={t('bannerD.title')}
      accent={t('bannerD.titleAccent')}
      description={t('bannerD.description')}
      icon={Bot}
      primaryButtonText={t('bannerD.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerD.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerD;
