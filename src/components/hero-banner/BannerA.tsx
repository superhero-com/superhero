import React from 'react';
import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';
import BannerContent from './BannerContent';
import { PostFeatureCard } from './HeroFeatureCards';

const BannerA = ({ onStartPosting }: { onStartPosting?: () => void }) => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      graphic={<PostFeatureCard />}
      eyebrow={t('bannerA.eyebrow')}
      title={t('bannerA.title')}
      accent={t('bannerA.titleAccent')}
      description={t('bannerA.description')}
      icon={MessageCircle}
      primaryButtonText={t('bannerA.primaryButton')}
      primaryButtonOnClick={onStartPosting}
      secondaryButtonText={t('bannerA.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerA;
