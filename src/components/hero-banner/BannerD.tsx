import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import { MarketGraphic } from './BannerGraphics';
import './bannerD.styles.css';

const BannerD = () => {
  const { t } = useTranslation('banners');
  return (
    <BannerContent
      title={(
        <>
          {t('bannerD.titleMain')}
          {' '}
          <span className="banner-d__accent">{t('bannerD.titleAccent')}</span>
        </>
      )}
      description={t('bannerD.description')}
      graphic={<MarketGraphic />}
      primaryButtonText={t('bannerD.primaryButton')}
      primaryButtonLink="/landing"
      secondaryButtonText={t('bannerD.secondaryButton')}
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerD;
