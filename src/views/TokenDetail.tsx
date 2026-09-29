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
import './TokenDetail.scss';
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
    <div className="dex-token-detail mx-auto mb-10 md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
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
          <section className="token-detail-metrics">
            <div className="token-detail-metrics-main">
              <div>
                <h3>{t('explore.totalVolume')}</h3>
                <div className="token-detail-value">
                  <PriceDataFormatter priceData={tokenDetails?.summary?.total_volume} />
                </div>
                <p>{t('common.views.tokenDetail.acrossPools', { count: tokenDetails?.pairs_count || 0 })}</p>
              </div>
              <div>
                <div className="token-detail-volume-label">
                  <h3>{t('explore.volume')}</h3>
                  <AppSelect
                    value={selectedPeriod}
                    onValueChange={(v) => setSelectedPeriod(v as '24h' | '7d' | '30d')}
                    triggerClassName="token-detail-period"
                    contentClassName="bg-background border-border"
                  >
                    <AppSelectItem value="24h">24h</AppSelectItem>
                    <AppSelectItem value="7d">7d</AppSelectItem>
                    <AppSelectItem value="30d">30d</AppSelectItem>
                  </AppSelect>
                </div>
                <div className="token-detail-value">
                  <PriceDataFormatter priceData={tokenDetails?.summary?.change?.[selectedPeriod]?.volume} />
                </div>
                <p>
                  {selectedPeriod === '24h'
                    ? t('common.views.tokenDetail.last24Hours')
                    : selectedPeriod === '7d'
                      ? t('common.views.tokenDetail.last7Days')
                      : t('common.views.tokenDetail.last30Days')}
                </p>
              </div>
            </div>
            <div className="token-detail-metrics-secondary">
              <div>
                <h3>{t('common.views.tokenDetail.locked')}</h3>
                <strong>{Decimal.from(token?.totalReserve || 0).prettify(2)}</strong>
                <p>{t('common.views.tokenDetail.symbolTokens', { symbol: tokenDetails?.symbol })}</p>
              </div>
              <div>
                <h3>{t('common.views.tokenDetail.totalSupply')}</h3>
                <strong>{circulatingSupply ? circulatingSupply.prettify() : '—'}</strong>
                <p>{t('common.views.tokenDetail.symbolTokens', { symbol: tokenDetails?.symbol })}</p>
              </div>
              <div>
                <h3>{t('explore.marketCapLabel')}</h3>
                <strong>
                  {circulatingSupply && tokenDetails?.price?.ae != null ? (
                    <>
                      {circulatingSupply.mul(Decimal.from(tokenDetails.price.ae)).shorten()}
                      {' '}
                      AE
                    </>
                  ) : '—'}
                </strong>
                <p>{t('common.views.tokenDetail.fullyDilutedValue')}</p>
              </div>
            </div>
          </section>
          <section className="token-detail-performance">
            <h3>{t('common.views.tokenDetail.pricePerformance')}</h3>
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
          </section>
        </div>
      </div>
      )}
    </div>
  );
}
