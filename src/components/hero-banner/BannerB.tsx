import React from 'react';
import BannerContent from './BannerContent';

const BannerB = () => (
  <BannerContent
    title="Tokenize #trends. Trade the signal."
    description="#Trends are markets. Go long on culture and let prices surface what matters."
    chips={['Popularity signals', 'Bonding curve']}
    primaryButtonText="Launch a #trend"
    primaryButtonLink="/trends/create"
    secondaryButtonText="Explore #trends"
    secondaryButtonLink="/trends/tokens"
  />
);

export default BannerB;
