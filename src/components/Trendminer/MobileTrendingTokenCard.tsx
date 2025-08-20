import React from 'react';
import TokenMiniChart from './TokenMiniChart';
import './MobileTrendingTokenCard.scss';

interface TokenItem {
  address: string;
  name: string;
  symbol: string;
  price: number;
  market_cap: number;
  holders_count: number;
  sale_address?: string;
  trending_score?: number;
}

interface MobileTrendingTokenCardProps {
  token: TokenItem;
  rank: number;
  timeframe: '30D' | '7D' | '1D';
  onClick?: () => void;
  className?: string;
}

export default function MobileTrendingTokenCard({
  token,
  rank,
  timeframe,
  onClick,
  className = '',
}: MobileTrendingTokenCardProps) {
  const normalizeAe = (n: number): number => {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      window.location.href = `/trendminer/tokens/${encodeURIComponent(token.name || token.address)}`;
    }
  };

  return (
    <div 
      className={`mobile-trending-token-card ${className}`}
      onClick={handleClick}
    >
      <div className="mobile-trending-token-card__header">
        <div className="mobile-trending-token-card__rank">#{rank}</div>
        <div className="mobile-trending-token-card__name">
          <div className="token-name">#{token.name || token.symbol}</div>
          <div className="token-symbol">#{token.symbol}</div>
        </div>
        <div className="mobile-trending-token-card__price">
          {normalizeAe(Number(token.price ?? 0)).toFixed(6)} AE
        </div>
      </div>
      
      <div className="mobile-trending-token-card__details">
        <div className="detail-item">
          <span className="detail-label">Market Cap</span>
          <span className="detail-value">
            {normalizeAe(Number(token.market_cap ?? 0)).toLocaleString()} AE
          </span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Holders</span>
          <span className="detail-value">{token.holders_count ?? 0}</span>
        </div>
      </div>
      
      <div className="mobile-trending-token-card__chart">
        <TokenMiniChart 
          address={token.sale_address || token.address} 
          width={280} 
          height={40} 
          stroke="#ff6d15" 
          timeframe={timeframe} 
        />
      </div>
    </div>
  );
}
