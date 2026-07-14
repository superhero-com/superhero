import React from 'react';
import BannerContent from './BannerContent';
import { MarketGraphic } from './BannerGraphics';
import './bannerD.styles.css';

const BannerD = () => (
  <BannerContent
    title={(
      <>
        Create or buy a #trend.
        <br className="mobile-break" />
        {' '}
        Then
        {' '}
        <span className="banner-d__accent">make it move.</span>
      </>
    )}
    description="Post the thesis. Build attention. Trade the hashtag market. Holders govern the DAO."
    graphic={<MarketGraphic />}
    primaryButtonText="Tokenize #trend"
    primaryButtonLink="/trends/create"
    secondaryButtonText="How it works"
    secondaryButtonLink="/faq"
  />
);

export default BannerD;
