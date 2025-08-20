import React from 'react';
import AeButton from '../AeButton';
import WalletConnectBtn from '../WalletConnectBtn';
import GlobalStatsAnalytics from './GlobalStatsAnalytics';
import './MobileTrendingBanner.scss';

interface MobileTrendingBannerProps {
  className?: string;
}

export default function MobileTrendingBanner({ className = '' }: MobileTrendingBannerProps) {
  return (
    <div className={`mobile-trending-banner ${className}`}>
      <div className="mobile-trending-banner__content">
        <div className="mobile-trending-banner__text">
          <h1 className="banner-title">
            Tokenize Trends.<br/>
            Own the Hype.<br/>
            Build Communities.
          </h1>
          
          <p className="banner-description">
            Tokenized trends are community tokens launched on a bonding curve. Price moves with buys/sells, no order books.
            Each token mints a DAO treasury that can fund initiatives via on-chain votes. Connect your wallet to trade and participate.
          </p>
        </div>
        
        <div className="mobile-trending-banner__stats">
          <GlobalStatsAnalytics />
        </div>
      </div>
      
      <div className="mobile-trending-banner__actions">
        <div className="action-buttons">
          <AeButton 
            variant="primary" 
            size="md" 
            rounded
            onClick={() => window.location.href = '/trendminer/create'}
            className="action-button"
          >
            Tokenize a Trend
          </AeButton>
          
          <AeButton 
            variant="secondary" 
            size="md" 
            rounded
            outlined
            onClick={() => window.open('https://wallet.superhero.com', '_blank')}
            className="action-button"
          >
            Get Superhero Wallet ↘
          </AeButton>
          
          <AeButton 
            variant="accent" 
            size="md" 
            rounded
            onClick={() => window.location.href = '/trendminer/daos'}
            className="action-button"
          >
            Explore DAOs
          </AeButton>
          
          <AeButton 
            variant="ghost" 
            size="md" 
            rounded
            onClick={() => window.location.href = '/trendminer/invite'}
            className="action-button"
          >
            Invite & Earn
          </AeButton>
          
          <WalletConnectBtn className="action-button" />
        </div>
      </div>
    </div>
  );
}
