import React from 'react';
import AeButton from '../AeButton';
import './MobileTrendingControls.scss';

interface MobileTrendingControlsProps {
  search: string;
  onSearchChange: (value: string) => void;
  orderBy: string;
  onOrderByChange: (value: string) => void;
  timeframe: '30D' | '7D' | '1D';
  onTimeframeChange: (value: '30D' | '7D' | '1D') => void;
  onRefresh?: () => void;
  loading?: boolean;
  className?: string;
}

export default function MobileTrendingControls({
  search,
  onSearchChange,
  orderBy,
  onOrderByChange,
  timeframe,
  onTimeframeChange,
  onRefresh,
  loading = false,
  className = '',
}: MobileTrendingControlsProps) {
  const getOrderByLabel = (value: string) => {
    switch (value) {
      case 'trending_score': return 'Hot';
      case 'market_cap': return 'Market Cap';
      case 'newest': return 'Newest';
      case 'oldest': return 'Oldest';
      case 'holders_count': return 'Holders';
      default: return value;
    }
  };

  return (
    <div className={`mobile-trending-controls ${className}`}>
      {/* Search Bar */}
      <div className="mobile-trending-controls__search">
        <div className="search-input-wrapper">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search tokens..."
            className="search-input"
          />
          {search && (
            <button
              className="search-clear"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="mobile-trending-controls__filters">
        <div className="filter-group">
          <label className="filter-label">Sort by</label>
          <select
            value={orderBy}
            onChange={(e) => onOrderByChange(e.target.value)}
            className="filter-select"
          >
            <option value="trending_score">Hot</option>
            <option value="market_cap">Market Cap</option>
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="holders_count">Holders</option>
          </select>
        </div>

        <div className="filter-group">
          <label className="filter-label">Timeframe</label>
          <div className="timeframe-buttons">
            {(['30D', '7D', '1D'] as const).map((tf) => (
              <button
                key={tf}
                className={`timeframe-button ${timeframe === tf ? 'active' : ''}`}
                onClick={() => onTimeframeChange(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mobile-trending-controls__actions">
        {onRefresh && (
          <AeButton
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="refresh-button"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </AeButton>
        )}
      </div>
    </div>
  );
}
