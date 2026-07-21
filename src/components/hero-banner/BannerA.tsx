import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import { PostTipGraphic } from './BannerGraphics';

interface BannerAProps {
  onStartPosting?: () => void;
}

const BannerA = ({ onStartPosting }: BannerAProps) => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      title={t('bannerA.title')}
      description={t('bannerA.description')}
      graphic={<PostTipGraphic />}
      primaryButtonText={t('bannerA.primaryButton')}
      primaryButtonOnClick={onStartPosting}
      secondaryButtonText={t('bannerA.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerA;
