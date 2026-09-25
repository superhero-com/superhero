import React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot } from 'lucide-react';
import artwork from '../../assets/hero/agents.webp';
import BannerContent from './BannerContent';

const BannerD = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerD.eyebrow')}
      title={t('bannerD.title')}
      accent={t('bannerD.titleAccent')}
      description={t('bannerD.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--agents"
      icon={Bot}
      primaryButtonText={t('bannerD.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerD.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerD;
