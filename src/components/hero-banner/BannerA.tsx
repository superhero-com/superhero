import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import BannerPostCard from './BannerPostCard';

interface BannerAProps {
  onStartPosting?: () => void;
}

const BannerA = ({ onStartPosting }: BannerAProps) => {
  const { t } = useTranslation('banners');
  const chips = t('bannerA.chips', { returnObjects: true }) as string[];
  return (
    <BannerContent
      title={t('bannerA.title')}
      description={t('bannerA.description')}
      chips={chips}
      primaryButtonText={t('bannerA.primaryButton')}
      primaryButtonOnClick={onStartPosting}
      secondaryButtonText={t('bannerA.secondaryButton')}
      secondaryButtonLink="/faq"
      visual={<BannerPostCard />}
    />
  );
};

export default BannerA;
