import { PriceDataFormatter } from '@/features/shared/components';
import { performanceChartTimeframeAtom } from '@/features/trending/atoms';
import PerformanceTimeframeSelector from '@/features/trending/components/PerformanceTimeframeSelector';
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
/* eslint-disable */
import { useNavigate } from 'react-router-dom';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import Spinner from '@/components/Spinner';
import { DexTokenDto } from '../../../api/generated';
import { Token } from '../types/explore';

interface TokenListTableProps {
  tokens: DexTokenDto[];
  sort: {
    key:
      | 'pairs_count'
      | 'name'
      | 'symbol'
      | 'created_at'
      | 'price'
      | 'tvl'
      | '24hchange'
      | '24hvolume'
      | '7dchange'
      | '7dvolume'
      | '30dchange'
      | '30dvolume';
    asc: boolean;
  };
  onSortChange: (
    key:
      | 'pairs_count'
      | 'name'
      | 'symbol'
      | 'created_at'
      | 'price'
      | 'tvl'
      | '24hchange'
      | '24hvolume'
      | '7dchange'
      | '7dvolume'
      | '30dchange'
      | '30dvolume'
  ) => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
}

export const TokenListTable = ({
  tokens,
  sort,
  onSortChange,
  search,
  onSearchChange,
  loading,
}: TokenListTableProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const performanceChartTimeframe = useAtomValue(performanceChartTimeframeAtom);

  const timeBase = useMemo(() => {
    if (performanceChartTimeframe === '1d') {
      return '24h';
    }

    return performanceChartTimeframe;
  }, [performanceChartTimeframe]);

  const handleSort = (key: 'pairs_count' | 'name' | 'symbol' | 'created_at' | 'price' | 'tvl' | '24hchange' | '24hvolume' | '7dchange' | '7dvolume' | '30dchange' | '30dvolume') => {
    onSortChange(key);
  };

  const handleTokenClick = (token: Token) => {
    navigate(`/defi/explore/tokens/${token.address}`);
  };

  const handleSwapClick = (token: Token) => {
    navigate(`/defi/swap?from=AE&to=${token.address}`);
  };

  const handleAddClick = (token: Token) => {
    navigate(`/defi/pool?from=AE&to=${token.address}`);
  };

  if (loading && tokens.length === 0) {
    return (
      <div
        className="liquid-glass rounded-xl"
        style={{
          textAlign: 'center',
          padding: 60,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            color: 'var(--light-font-color)',
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          <Spinner className="w-10 h-10" />
          {t('explore.tokenListTable.loadingTokens')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Compact Filter Controls */}
      <div
        className="liquid-glass rounded-xl"
        style={{
          padding: '12px 16px',
          marginBottom: 20,
        }}
      >
        {/* Compact Filter Layout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: Filter & Sort Label + Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 3,
                  height: 16,
                  background: 'var(--primary-gradient)',
                  borderRadius: 2,
                }}
              />
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--standard-font-color)',
                  background: 'var(--primary-gradient)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('explore.tokenListTable.filterAndSort')}
              </span>
            </div>

            {/* Enhanced Dropdown Container */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div>
                <AppSelect
                  value={sort.key as string}
                  onValueChange={(v) => handleSort(v as any)}
                  triggerClassName="py-1.5 pl-3 pr-7 rounded-lg bg-[var(--glass-bg)] text-[var(--standard-font-color)] border border-[var(--glass-border)] backdrop-blur-[10px] text-[13px] font-medium cursor-pointer transition-all duration-300 outline-none min-w-[100px]"
                >
                  <AppSelectItem value="pairs_count">{t('explore.pools')}</AppSelectItem>
                  <AppSelectItem value="price">{t('explore.price')}</AppSelectItem>
                  <AppSelectItem value="tvl">{t('explore.tokenListTable.tvl')}</AppSelectItem>
                  <AppSelectItem value="24hchange">{t('explore.tokenListTable.change24h')}</AppSelectItem>
                  <AppSelectItem value="24hvolume">{t('explore.tokenListTable.volume24h')}</AppSelectItem>
                  <AppSelectItem value="7dchange">{t('explore.tokenListTable.change7d')}</AppSelectItem>
                  <AppSelectItem value="7dvolume">{t('explore.tokenListTable.volume7d')}</AppSelectItem>
                  <AppSelectItem value="30dchange">{t('explore.tokenListTable.change30d')}</AppSelectItem>
                  <AppSelectItem value="30dvolume">{t('explore.tokenListTable.volume30d')}</AppSelectItem>
                  <AppSelectItem value="created_at">{t('explore.tokenListTable.createdAt')}</AppSelectItem>
                </AppSelect>
              </div>

              <button
                onClick={() => handleSort(sort.key)}
                style={{
                  padding: '6px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--glass-border)',
                  background: sort.asc
                    ? 'var(--accent-color)'
                    : 'var(--glass-bg)',
                  color: sort.asc ? 'white' : 'var(--standard-font-color)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: 13,
                  fontWeight: 600,
                  minWidth: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none',
                }}
                onMouseOver={(e) => {
                  if (!sort.asc) {
                    e.currentTarget.style.background = 'var(--accent-color)';
                    e.currentTarget.style.color = 'white';
                  }
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
                }}
                onMouseOut={(e) => {
                  if (!sort.asc) {
                    e.currentTarget.style.background = 'var(--glass-bg)';
                    e.currentTarget.style.color = 'var(--standard-font-color)';
                  }
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={sort.asc ? t('explore.tokenListTable.sortAscending') : t('explore.tokenListTable.sortDescending')}
              >
                {sort.asc ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Center: Search Input */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              minWidth: 200,
              maxWidth: 400,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--light-font-color)',
                fontSize: 14,
                pointerEvents: 'none',
                opacity: 0.6,
                zIndex: 1,
              }}
            >
              🔍
            </div>
            <input
              placeholder={t('explore.tokenListTable.searchTokens')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 32px',
                borderRadius: 8,
                background: 'var(--glass-bg)',
                color: 'var(--standard-font-color)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)',
                fontSize: 13,
                fontWeight: 400,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = 'var(--glass-bg)';
              }}
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: 6,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 20,
                  height: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--light-font-color)',
                  fontSize: 10,
                  transition: 'all 0.3s ease',
                  outline: 'none',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)';
                  e.currentTarget.style.color = '#ff6b6b';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.color = 'var(--light-font-color)';
                  e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
                }}
                title={t('explore.tokenListTable.clearSearch')}
              >
                ✕
              </button>
            )}
          </div>

          {/* Right: Results Counter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(76, 175, 80, 0.1)',
              padding: '6px 10px',
              borderRadius: 16,
              border: '1px solid rgba(76, 175, 80, 0.2)',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: 'var(--accent-color)',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: 'var(--accent-color)',
                fontWeight: 600,
              }}
            >
              {t('explore.tokenListTable.tokenCount', { count: tokens.length })}
            </span>
          </div>
        </div>

        {/* Compact Active Filters Display */}
        {(search || sort.key !== 'name') && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500,
                opacity: 0.8,
              }}
            >
              {t('explore.tokenListTable.activeLabel')}
            </span>
            {search && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(76, 175, 80, 0.12)',
                  padding: '2px 6px',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                <span>
                  {t('explore.tokenListTable.searchLabel')}
                  {' "'}
                  {search.length > 15
                    ? `${search.substring(0, 15)}...`
                    : search}
                  "
                </span>
                <button
                  onClick={() => onSearchChange('')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    fontSize: 9,
                    padding: 0,
                    outline: 'none',
                    opacity: 0.7,
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.opacity = '0.7';
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            {sort.key !== 'name' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(76, 175, 80, 0.12)',
                  padding: '2px 6px',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(76, 175, 80, 0.2)',
                }}
              >
                <span>
                  {t('explore.tokenListTable.sortLabel')}
                  {' '}
                  {sort.key}
                  {' '}
                  {sort.asc ? '↑' : '↓'}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add keyframes for pulse animation */}
      <style>
        {`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}
      </style>

      {/* Table */}
      <div
        className="liquid-glass rounded-xl"
        style={{
          // overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderBottom: '1px solid var(--glass-border)',
              }}
            >
              <th
                style={{
                  textAlign: 'left',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {t('explore.tokenListTable.name')}
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {t('explore.pools')}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {t('explore.price')}
              </th>
              <th
                style={{
                  textAlign: 'left',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                <div className="flex items-center gap-2">
                  {t('explore.volume')}
                  <div className="flex items-center justify-center w-auto flex-shrink-0">
                    <PerformanceTimeframeSelector />
                  </div>
                </div>
              </th>

              <th
                style={{
                  textAlign: 'left',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {t('explore.totalVolume')}
              </th>
              <th
                style={{
                  textAlign: 'center',
                  padding: '16px 12px',
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 600,
                  letterSpacing: '0.5px',
                }}
              >
                {t('explore.actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {tokens.map((token) => (
              <tr
                key={token.address}
                style={{
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
                onClick={() => handleTokenClick(token)}
              >
                {/* Name Column */}
                <td style={{ padding: '16px 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        color: 'var(--accent-color)',
                        textDecoration: 'none',
                        background: 'none',
                        border: 'none',
                        fontSize: 15,
                        fontWeight: 600,
                        transition: 'all 0.3s ease',
                        padding: 0,
                        textAlign: 'left',
                      }}
                    >
                      {token.symbol}
                    </div>
                    <span
                      style={{
                        color: 'var(--light-font-color)',
                        fontSize: 10,
                        fontWeight: 500,
                      }}
                    >
                      {token.name}
                    </span>
                  </div>
                </td>

                {/* Pools Column */}
                <td
                  style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    fontSize: 14,
                    color: 'var(--standard-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {token.pairs_count || 0}
                </td>

                {/* Price Column */}
                <td
                  style={{
                    textAlign: 'right',
                    padding: '16px 12px',
                    fontSize: 14,
                    color: 'var(--standard-font-color)',
                    fontWeight: 500,
                  }}
                >
                  <PriceDataFormatter priceData={token.price} />
                </td>

                {/* 24h Volume Column */}
                <td
                  style={{
                    textAlign: 'right',
                    padding: '16px 12px',
                    fontSize: 14,
                    color: 'var(--standard-font-color)',
                    fontWeight: 500,
                  }}
                >
                  <PriceDataFormatter
                    priceData={token.summary?.change?.[timeBase]?.volume}
                  />
                </td>

                {/* Total Volume Column */}
                <td
                  style={{
                    textAlign: 'center',
                    padding: '16px 12px',
                    fontSize: 14,
                    color: 'var(--standard-font-color)',
                    fontWeight: 500,
                  }}
                >
                  <PriceDataFormatter
                    priceData={token.summary?.total_volume}
                  />
                </td>
                <td style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwapClick(token);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        color: 'var(--standard-font-color)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--button-gradient)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'var(--glass-bg)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.color = 'var(--standard-font-color)';
                      }}
                    >
                      {t('explore.swap')}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddClick(token);
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 8,
                        border: '1px solid var(--glass-border)',
                        background: 'var(--glass-bg)',
                        color: 'var(--standard-font-color)',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.3s ease',
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'var(--button-gradient)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'var(--glass-bg)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.color = 'var(--standard-font-color)';
                      }}
                    >
                      {t('explore.add')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tokens.length === 0 && !loading && (
        <div
          className="liquid-glass rounded-xl"
          style={{
            textAlign: 'center',
            padding: 60,
            marginTop: 20,
          }}
        >
          <div
            style={{
              color: 'var(--light-font-color)',
              fontSize: 16,
              fontWeight: 500,
              marginBottom: 8,
            }}
          >
            {t('explore.tokenListTable.noTokensFound')}
          </div>
          <div
            style={{
              color: 'var(--light-font-color)',
              fontSize: 14,
              opacity: 0.7,
            }}
          >
            {t('explore.tokenListTable.tryAdjustingSearch')}
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenListTable;
