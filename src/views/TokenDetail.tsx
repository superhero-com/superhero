/* eslint-disable
  react/function-component-definition,
  no-nested-ternary
*/
import { DexService } from '@/api/generated';
import { PriceDataFormatter } from '@/features/shared/components';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import DexTokenHeader from '../features/dex/components/DexTokenHeader';
import { TokenPricePerformance } from '../features/dex/components';
import { useAeSdk } from '../hooks';
import { Decimal } from '../libs/decimal';
import Spinner from '../components/Spinner';
import { getTokenWithUsd } from '../libs/dexBackend';

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  malformed: boolean;
  noContract: boolean;
  listed: boolean;
  priceAe: string;
  priceUsd: string;
  tvlAe: string;
  tvlUsd: string;
  totalReserve: string;
  pairs: number;
  volumeUsdDay: string | null;
  volumeUsdWeek: string | null;
  volumeUsdMonth: string | null;
  volumeUsdYear: string;
  volumeUsdAll: string;
  priceChangeDay: string;
  priceChangeWeek: string;
  priceChangeMonth: string;
  priceChangeYear: string;
}

export default function TokenDetail() {
  const { t } = useTranslation();
  const { activeNetwork } = useAeSdk();
  const params = useParams();
  const tokenAddress = params.tokenAddress || params.id || '';
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>(
    '24h',
  );

  const {
    data: tokenDetails, isPending: detailsLoading, isError: detailsFailed, refetch: retryDetails,
  } = useQuery({
    queryKey: ['DexService.getDexTokenByAddress', tokenAddress],
    queryFn: () => DexService.getDexTokenByAddress({ address: tokenAddress }),
    enabled: !!tokenAddress,
  });

  const {
    data: token = null,
    isLoading: loading,
    error: tokenError,
  } = useQuery<TokenData | null>({
    queryKey: ['DexBackend.getTokenWithUsd', tokenAddress],
    queryFn: () => getTokenWithUsd(tokenAddress as string),
    enabled: !!tokenAddress,
  });
  const error = tokenError ? (tokenError as Error).message || t('common.views.tokenDetail.failedToLoad') : null;

  const { data: aex9Data } = useQuery({
    queryKey: ['Mdw.aex9', tokenAddress],
    queryFn: async () => {
      const result = await fetch(
        `${activeNetwork.middlewareUrl}/v3/aex9/${tokenAddress}`,
      );
      const data = await result.json();
      return data;
    },
    enabled: !!tokenAddress,
  });

  // Circulating supply comes from the separate middleware aex9 query, which can
  // still be pending after the page leaves its loading state. Until both
  // event_supply and decimals are present, the division would produce a bogus
  // value, so treat it as not-yet-available and render a placeholder instead.
  const circulatingSupply = useMemo(() => {
    const supply = aex9Data?.event_supply;
    const decimals = aex9Data?.decimals;
    if (supply == null || decimals == null) return null;
    try {
      return Decimal.from(supply).div(10 ** Number(decimals));
    } catch {
      return null;
    }
  }, [aex9Data]);

  return (
    <div className="mx-auto mb-10 md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <DexTokenHeader
        address={tokenAddress}
        token={tokenDetails}
        loading={detailsLoading}
        failed={detailsFailed}
        onRetry={() => { retryDetails(); }}
      />
      {loading && <div className="flex justify-center p-5"><Spinner className="w-6 h-6" /></div>}
      {error && <div className="text-sm text-red-400" role="alert">{error}</div>}
      {!loading && !error && tokenDetails && (
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        <div className="flex flex-col gap-6">
          {/* Token Detail Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Token Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* TVL Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background:
                    'linear-gradient(135deg, rgba(0, 255, 127, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  border: '1px solid rgba(0, 255, 127, 0.2)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  🏦
                  {' '}
                  {t('explore.totalVolume')}
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--success-color)',
                    marginBottom: 4,
                    fontFamily: 'monospace',
                  }}
                >
                  {/* ${Decimal.from(token?.tvlUsd || 0).prettify(2)} */}
                  <PriceDataFormatter
                    priceData={tokenDetails?.summary?.total_volume}
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {t('common.views.tokenDetail.acrossPools', { count: tokenDetails?.pairs_count || 0 })}
                </div>
              </div>

              {/* Volume Card */}
              <div
                style={{
                  padding: 20,
                  borderRadius: 16,
                  background:
                    'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                  border: '1px solid rgba(138, 43, 226, 0.2)',
                  backdropFilter: 'blur(10px)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
                  <span>
                    📊
                    {' '}
                    {t('explore.volume')}
                  </span>
                  <AppSelect
                    value={selectedPeriod}
                    onValueChange={(v) => setSelectedPeriod(v as '24h' | '7d' | '30d')}
                    triggerClassName="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
                    contentClassName="bg-[#1a1a1a] border-white/20"
                  >
                    <AppSelectItem value="24h">24h</AppSelectItem>
                    <AppSelectItem value="7d">7d</AppSelectItem>
                    <AppSelectItem value="30d">30d</AppSelectItem>
                  </AppSelect>
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: 'var(--accent-color)',
                    marginBottom: 4,
                    fontFamily: 'monospace',
                  }}
                >
                  <PriceDataFormatter
                    priceData={
                      tokenDetails?.summary?.change?.[selectedPeriod]?.volume
                    }
                  />
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {selectedPeriod === '24h'
                    ? t('common.views.tokenDetail.last24Hours')
                    : selectedPeriod === '7d'
                      ? t('common.views.tokenDetail.last7Days')
                      : t('common.views.tokenDetail.last30Days')}
                </div>
              </div>
            </div>

            {/* Secondary Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Locked Tokens */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--light-font-color)',
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🔒
                  {' '}
                  {t('common.views.tokenDetail.locked')}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2,
                  }}
                >
                  {Decimal.from(token?.totalReserve || 0).prettify(2)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {t('common.views.tokenDetail.symbolTokens', { symbol: tokenDetails?.symbol })}
                </div>
              </div>

              {/* Total Supply */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--light-font-color)',
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  🪙
                  {' '}
                  {t('common.views.tokenDetail.totalSupply')}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2,
                  }}
                >
                  {circulatingSupply ? circulatingSupply.prettify() : '—'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {t('common.views.tokenDetail.symbolTokens', { symbol: tokenDetails?.symbol })}
                </div>
              </div>

              {/* Market Cap (VFD) */}
              <div
                style={{
                  padding: 18,
                  borderRadius: 14,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--light-font-color)',
                    marginBottom: 8,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  💎
                  {' '}
                  {t('explore.marketCapLabel')}
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2,
                  }}
                >
                  {circulatingSupply && tokenDetails?.price?.ae != null ? (
                    <>
                      {circulatingSupply.mul(Decimal.from(tokenDetails.price.ae)).shorten()}
                      {' '}
                      AE
                    </>
                  ) : '—'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {t('common.views.tokenDetail.fullyDilutedValue')}
                </div>
              </div>
            </div>
          </div>

          {/* Price Performance Chart Card */}
          <div
            className="genz-card"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(20px)',
              borderRadius: 24,
              padding: 24,
              boxShadow: 'var(--glass-shadow)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: 'var(--standard-font-color)',
                  margin: 0,
                }}
              >
                {t('common.views.tokenDetail.pricePerformance')}
              </h3>
            </div>

            <div style={{ marginTop: 8 }}>
              <TokenPricePerformance
                availableGraphTypes={[
                  { type: 'Price', text: t('explore.price') },
                  { type: 'Volume', text: t('explore.volume') },
                ]}
                initialChart={{ type: 'Price', text: t('explore.price') }}
                initialTimeFrame="1Y"
                tokenId={tokenAddress}
                className="token-detail-chart"
              />
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
