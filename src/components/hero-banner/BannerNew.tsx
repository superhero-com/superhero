import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import { AvailabilityGraphic } from './BannerGraphics';

const BannerNew = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      title={t('bannerNew.title')}
      description={t('bannerNew.description')}
      graphic={<AvailabilityGraphic />}
      primaryButtonText={t('bannerNew.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerNew.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerNew;
