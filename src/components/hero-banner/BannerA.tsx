import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import artwork from '../../assets/hero/posting.webp';
import BannerContent from './BannerContent';

const BannerA = ({ onStartPosting }: { onStartPosting?: () => void }) => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      eyebrow={t('bannerA.eyebrow')}
      title={t('bannerA.title')}
      accent={t('bannerA.titleAccent')}
      description={t('bannerA.description')}
      artwork={artwork}
      artworkClass="hero-slide__art--posting"
      icon={MessageCircle}
      primaryButtonText={t('bannerA.primaryButton')}
      primaryButtonOnClick={onStartPosting}
      secondaryButtonText={t('bannerA.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerA;
