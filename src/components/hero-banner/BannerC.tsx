import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import { TreasuryGraphic } from './BannerGraphics';

const BannerC = () => {
  const { t } = useTranslation('banners');
  const chips = t('bannerC.chips', { returnObjects: true }) as string[];
  return (
    <BannerContent
      title={t('bannerC.title')}
      description={t('bannerC.description')}
      chips={chips}
      graphic={<TreasuryGraphic />}
      primaryButtonText={t('bannerC.primaryButton')}
      primaryButtonLink="/trends/create"
      secondaryButtonText={t('bannerC.secondaryButton')}
      secondaryButtonLink="/trends/daos"
    />
  );
};

export default BannerC;
