import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';

const BannerB = () => {
  const { t } = useTranslation('banners');
  const chips = t('bannerB.chips', { returnObjects: true }) as string[];
  return (
    <BannerContent
      title={t('bannerB.title')}
      description={t('bannerB.description')}
      chips={chips}
      primaryButtonText={t('bannerB.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerB.secondaryButton')}
      secondaryButtonLink="/trends/tokens"
    />
  );
};

export default BannerB;
