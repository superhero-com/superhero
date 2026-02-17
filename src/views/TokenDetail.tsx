/* eslint-disable
  @typescript-eslint/no-unused-vars,
  react/function-component-definition,
  react-hooks/exhaustive-deps,
  no-unsafe-optional-chaining,
  no-nested-ternary
*/
import { DexPairService, DexService } from '@/api/generated';
import { PriceDataFormatter } from '@/features/shared/components';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AeButton from '../components/AeButton';
import { TokenPricePerformance } from '../features/dex/components';
import { useAeSdk } from '../hooks';
import { Decimal } from '../libs/decimal';
import Spinner from '../components/Spinner';
import { getPairsByTokenUsd, getTokenWithUsd } from '../libs/dexBackend';

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
  const { activeNetwork } = useAeSdk();
  const { tokenAddress } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [tokenMetaData, setTokenMetaData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>(
    '24h',
  );

  const { data: tokenDetails } = useQuery({
    queryKey: ['DexService.getDexTokenSummary', tokenAddress],
    queryFn: () => DexService.getDexTokenByAddress({ address: tokenAddress }),
    enabled: !!tokenAddress,
  });

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

  const isPositive = useMemo(() => Number(tokenDetails?.summary?.change?.[selectedPeriod]
    ?.percentage) >= 0, [selectedPeriod, tokenDetails?.summary?.change]);

  async function getTokenMetaData(_tokenAddress: string) {
    const result = await fetch(
      `${activeNetwork.middlewareUrl}/v3/aex9/${_tokenAddress}`,
    );
    const data = await result.json();
    return data;
  }

  // TODO: remvoe
  useEffect(() => {
    (async () => {
      if (!tokenAddress) return;
      setLoading(true);
      setError(null);

      try {
        const [t, metaData] = await Promise.all([
          getTokenWithUsd(tokenAddress),
          getPairsByTokenUsd(tokenAddress),
          getTokenMetaData(tokenAddress),
        ]);

        setToken(t);
        setTokenMetaData(metaData);
      } catch (e: any) {
        setError(e.message || 'Failed to load token data');
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenAddress]);

  const totalSupply = useMemo(() => {
    if (!tokenMetaData) return Decimal.ZERO;
    return Decimal.from(tokenMetaData?.event_supply).div(
      10 ** tokenMetaData?.decimals,
    );
  }, [tokenMetaData]);

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-5 flex justify-center items-center min-h-[400px]">
        <div className="text-center text-white/60 flex flex-col items-center gap-4">
          <Spinner className="w-8 h-8" />
          Loading token details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto md:p-5 flex flex-col gap-6 md:gap-8 min-h-screen">
        <div className="text-center p-10 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20 backdrop-blur-xl">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-10 md:px-5 md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        <div className="flex flex-col gap-6">
          {/* Token Detail Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
            {/* Header */}
            <div className="mb-6">
              {
                !tokenDetails ? (
                  <div className="text-center text-white/60 flex flex-col items-center gap-4">
                    <Spinner className="w-8 h-8" />
                    Loading token details...
                  </div>
                ) : (
                  <h1 className="text-[28px] font-bold text-white m-0 mb-2 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-600 bg-clip-text text-transparent">
                    {tokenDetails?.symbol}
                    {
                      tokenDetails?.name && tokenDetails?.name !== tokenDetails?.symbol && (
                        <span className="text-white/60">
                          {' '}
                          /
                          {tokenDetails?.name}
                        </span>
                      )
                    }
                  </h1>
                )
              }
              <p className="text-sm text-white/60 m-0 leading-relaxed">
                Token details and statistics
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <AeButton
                onClick={() => navigate(`/defi/swap?from=AE&to=${tokenAddress}`)}
                variant="secondary-dark"
                size="medium"
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Swap
              </AeButton>
              <AeButton
                onClick={() => navigate(`/defi/pool?from=AE&to=${tokenAddress}`)}
                variant="secondary-dark"
                size="medium"
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Add Liquidity
              </AeButton>
              <AeButton
                onClick={() => navigate(`/defi/explore/pools?tokenAddress=${tokenAddress}`)}
                variant="secondary-dark"
                size="medium"
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Pools (
                {tokenDetails?.pairs_count || 0}
                )
              </AeButton>
              <AeButton
                onClick={() => navigate(`/defi/explore/transactions?tokenAddress=${tokenAddress}`)}
                variant="secondary-dark"
                size="medium"
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Transactions
              </AeButton>
            </div>

            {/* Token Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* Price Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-red-400/10 to-white/5 border border-red-400/20 backdrop-blur-xl relative overflow-hidden">
                <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
                  💰 Price
                </div>
                <div className="text-2xl font-extrabold text-white mb-1 font-mono">
                  <PriceDataFormatter
                    priceData={tokenDetails?.price}
                  />
                </div>
                {tokenDetails?.summary?.change?.[selectedPeriod]
                  ?.percentage && (
                    <div
                      className={`text-xs font-semibold flex items-center gap-1 ${isPositive
                        ? 'text-green-400'
                        : 'text-red-400'
                      }`}
                    >
                      {isPositive
                        ? '📈'
                        : '📉'}
                      {isPositive
                        ? '+'
                        : ''}
                      {
                        Decimal.from(
                          tokenDetails?.summary?.change?.[selectedPeriod]
                            ?.percentage,
                        ).prettify(2)
                      }
                      % (
                      {selectedPeriod}
                      )
                    </div>
                )}
              </div>

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
                  🏦 Total Volume
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
                  Across
                  {' '}
                  {tokenDetails?.pairs_count || 0}
                  {' '}
                  pool
                  {tokenDetails?.pairs_count !== 1 ? 's' : ''}
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
                  📊 Volume
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
                    ? 'Last 24 hours'
                    : selectedPeriod === '7d'
                      ? 'Last 7 days'
                      : 'Last 30 days'}
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
                  🔒 Locked
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
                  {tokenDetails?.symbol}
                  {' '}
                  tokens
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
                  🪙 Total Supply
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2,
                  }}
                >
                  {
                    Decimal.from(aex9Data?.event_supply).div(10 ** aex9Data?.decimals).prettify()
                  }
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  {tokenDetails?.symbol}
                  {' '}
                  tokens
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
                  💎 Market Cap
                </div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 2,
                  }}
                >
                  {
                    Decimal
                      .from(aex9Data?.event_supply)
                      .div(10 ** aex9Data?.decimals)
                      .mul(Decimal.from(tokenDetails?.price?.ae || 0))
                      .shorten()
                  }
                  {' '}
                  AE
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                  }}
                >
                  Fully diluted value
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
                Price Performance
              </h3>
            </div>

            <div style={{ marginTop: 8 }}>
              <TokenPricePerformance
                availableGraphTypes={[
                  { type: 'Price', text: 'Price' },
                  { type: 'Volume', text: 'Volume' },
                  { type: 'TVL', text: 'Total Value Locked' },
                  { type: 'Fees', text: 'Fees' },
                ]}
                initialChart={{ type: 'Price', text: 'Price' }}
                initialTimeFrame="1Y"
                tokenId={tokenAddress}
                className="token-detail-chart"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
