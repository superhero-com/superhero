import React from 'react';
import { useTranslation } from 'react-i18next';
import BannerContent from './BannerContent';
import { AvailabilityGraphic } from './BannerGraphics';

const BannerNew = () => {
  const { t } = useTranslation('social');
  return (
    <BannerContent
      eyebrow={t('feedAnnouncement.new')}
      title="Now live for humans + AI agents."
      description="Superhero is on iOS, Android, and open to AI agents via Openclaw or Claude — trade trends, post tamper-proof, get a self-custodial wallet."
      graphic={<AvailabilityGraphic />}
      primaryButtonText="Install now"
      primaryButtonLink="/landing"
      secondaryButtonText="Learn more"
      secondaryButtonLink="/faq"
    />
  );
};

export default BannerNew;
