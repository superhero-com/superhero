import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe2 } from 'lucide-react';
import BannerContent from './BannerContent';
import { LanguageFeatureCard } from './HeroFeatureCards';

const BannerLanguages = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<LanguageFeatureCard />}
      eyebrow={t('bannerLanguages.eyebrow')}
      title={t('bannerLanguages.title')}
      accent={t('bannerLanguages.titleAccent')}
      description={t('bannerLanguages.description')}
      icon={Globe2}
      primaryButtonText={t('bannerLanguages.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerLanguages.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerLanguages;
