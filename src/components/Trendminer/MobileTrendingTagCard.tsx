import React from 'react';
import AeButton from '../AeButton';
import './MobileTrendingTagCard.scss';

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

interface MobileTrendingTagCardProps {
  tag: string;
  score: number;
  source?: string;
  token?: TokenItem;
  onTokenize?: () => void;
  onView?: () => void;
  className?: string;
}

export default function MobileTrendingTagCard({
  tag,
  score,
  source,
  token,
  onTokenize,
  onView,
  className = '',
}: MobileTrendingTagCardProps) {
  const normalizeAe = (n: number): number => {
    if (!isFinite(n)) return 0;
    return n >= 1e12 ? n / 1e18 : n;
  };

  const handleTokenize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTokenize) {
      onTokenize();
    } else {
      window.location.href = `/trendminer/create?new=${encodeURIComponent(tag)}`;
    }
  };

  const handleView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onView) {
      onView();
    } else if (token) {
      window.location.href = `/trendminer/tokens/${encodeURIComponent(token.name || token.address)}`;
    }
  };

  return (
    <div className={`mobile-trending-tag-card ${className}`}>
      <div className="mobile-trending-tag-card__header">
        <div className="mobile-trending-tag-card__tag">
          <div className="tag-name">#{tag.toUpperCase()}</div>
          {source && (
            <div className="tag-source">via {source}</div>
          )}
        </div>
        <div className="mobile-trending-tag-card__score">
          ↑ {score.toLocaleString()}
        </div>
      </div>
      
      {token ? (
        <div className="mobile-trending-tag-card__token-info">
          <div className="token-details">
            <div className="token-price">
              {normalizeAe(Number(token.price ?? 0)).toFixed(6)} AE
            </div>
            <div className="token-holders">
              {token.holders_count ?? 0} holders
            </div>
          </div>
          <AeButton
            variant="accent"
            size="xs"
            outlined
            onClick={handleView}
            className="view-button"
          >
            View #{token.name || token.symbol}
          </AeButton>
        </div>
      ) : (
        <div className="mobile-trending-tag-card__actions">
          <AeButton
            variant="accent"
            size="xs"
            rounded
            onClick={handleTokenize}
            className="tokenize-button"
          >
            Tokenize
          </AeButton>
        </div>
      )}
    </div>
  );
}
