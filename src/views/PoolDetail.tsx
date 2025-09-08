import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AddressChip } from '../components/AddressChip';
import AeButton from '../components/AeButton';
import { TokenChip } from '../components/TokenChip';
import { TransactionCard } from '../components/TransactionCard';
import { useAeSdk } from '../hooks';
import { Decimal } from '../libs/decimal';
import { getPairDetails, getHistory, getTokenWithUsd } from '../libs/dexBackend';
import moment from 'moment';
import { PoolCandlestickChart } from '../features/dex/components/charts/PoolCandlestickChart';

// Pool-specific data interface (modified from TokenData)
interface PoolData {
  address: string;
  token0: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    malformed: boolean;
    noContract: boolean;
    listed: boolean;
  };
  token1: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    malformed: boolean;
    noContract: boolean;
    listed: boolean;
  };
  synchronized: boolean;
  liquidityInfo: {
    totalSupply: string;
    reserve0: string;
    reserve1: string;
    height: number;
  };
}

// Keep the same TransactionData interface as TokenDetail
interface TransactionData {
  hash: string;
  type: 'SwapTokens' | 'CreatePair' | 'PairMint';
  pairAddress?: string;
  senderAccount?: string;
  reserve0?: string;
  reserve1?: string;
  deltaReserve0?: string;
  deltaReserve1?: string;
  token0AePrice?: string;
  token1AePrice?: string;
  aeUsdPrice?: string;
  height?: number;
  microBlockHash?: string;
  microBlockTime?: string;
  transactionHash?: string;
  transactionIndex?: string;
  logIndex?: number;
  reserve0Usd?: string;
  reserve1Usd?: string;
  delta0UsdValue?: string;
  delta1UsdValue?: string;
  txUsdFee?: string;
}

export default function PoolDetail() {
  const { activeNetwork } = useAeSdk()
  const { poolAddress } = useParams(); // Changed from tokenAddress to poolAddress
  const navigate = useNavigate();

  // Pool-specific state (modified from token state)
  const [pool, setPool] = useState<PoolData | null>(null); // Changed from token to pool
  const [token0Data, setToken0Data] = useState<any | null>(null); // New: token0 metadata
  const [token1Data, setToken1Data] = useState<any | null>(null); // New: token1 metadata
  const [history, setHistory] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions'>('overview'); // Changed tab names
  const [tokenSymbolCache, setTokenSymbolCache] = useState<Record<string, string>>({});

  // Helper function to get token metadata (same as TokenDetail)
  async function getTokenMetaData(_tokenAddress: string) {
    const result = await fetch(`${activeNetwork.middlewareUrl}/v3/aex9/${_tokenAddress}`);
    const data = await result.json();
    return data;
  }

  // Function to get token symbol with caching (same as TokenDetail)
  const getTokenSymbol = useCallback(async (address: string): Promise<string> => {
    if (!address || address === '' || address === 'AE') return 'AE';
    if (typeof address !== 'string') return 'Unknown';

    // Check cache first
    if (tokenSymbolCache[address]) {
      return tokenSymbolCache[address];
    }

    try {
      const metadata = await getTokenMetaData(address);
      const symbol = metadata?.symbol || address.slice(0, 6);

      // Update cache
      setTokenSymbolCache(prev => ({
        ...prev,
        [address]: symbol
      }));

      return symbol;
    } catch (error) {
      // Fallback to shortened address
      const fallback = address.slice(0, 6);
      setTokenSymbolCache(prev => ({
        ...prev,
        [address]: fallback
      }));
      return fallback;
    }
  }, [activeNetwork.middlewareUrl, tokenSymbolCache]);

  // Get token symbol from cache (synchronous) (same as TokenDetail)
  const getCachedTokenSymbol = useCallback((address: string): string => {
    if (!address || address === '' || address === 'AE') return 'AE';
    if (typeof address !== 'string') return 'Unknown';
    return tokenSymbolCache[address] || address.slice(0, 6);
  }, [tokenSymbolCache]);

  // Get transaction token symbols (simplified for pools since we have the data)
  const getTransactionTokens = useCallback((tx: TransactionData): { token0Symbol: string, token1Symbol: string } => {
    return {
      token0Symbol: pool?.token0?.symbol || 'Token A',
      token1Symbol: pool?.token1?.symbol || 'Token B'
    };
  }, [pool]);

  // Load pool data (modified from TokenDetail's useEffect)
  useEffect(() => {
    (async () => {
      if (!poolAddress) return;
      setLoading(true);
      setError(null);

      try {
        // Get pool details and history
        const [poolData, hist] = await Promise.all([
          getPairDetails(poolAddress),
          getHistory({ pairAddress: poolAddress, order: 'desc' }),
        ]);

        if (!poolData) {
          throw new Error('Pool not found');
        }

        setPool(poolData);
        setHistory(hist || []);

        // Get token data for both tokens in the pool
        const [token0Info, token1Info] = await Promise.all([
          getTokenWithUsd(poolData.token0.address),
          getTokenWithUsd(poolData.token1.address),
        ]);

        setToken0Data(token0Info);
        setToken1Data(token1Info);

        // Pre-populate token symbol cache using the new structure
        const initialCache: Record<string, string> = {
          'AE': 'AE',
        };

        // Use symbols from the pool data directly
        if (poolData.token0?.symbol) {
          initialCache[poolData.token0.address] = poolData.token0.symbol;
        }

        if (poolData.token1?.symbol) {
          initialCache[poolData.token1.address] = poolData.token1.symbol;
        }

        setTokenSymbolCache(initialCache);
      } catch (e: any) {
        setError(e.message || 'Failed to load pool data');
      } finally {
        setLoading(false);
      }
    })();
  }, [poolAddress]);

  // Utility functions (same as TokenDetail)
  const formatNumber = (num: number | string | undefined, decimals = 2) => {
    const n = Number(num || 0);
    if (n === 0) return '0';
    if (n < 0.01) return '< 0.01';
    if (n < 1000) return n.toFixed(decimals);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
    return `${(n / 1000000000).toFixed(1)}B`;
  };

  const formatTokenAmount = (amount: string | number | undefined, decimals = 18) => {
    const n = Number(amount || 0);
    if (n === 0) return '0';
    const units = n / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { maximumFractionDigits: 6 });
  };

  // Pool-specific computed values (updated for new structure)
  const poolStats = useMemo(() => {
    if (!pool || !pool.liquidityInfo) return null;

    const reserve0 = Number(pool.liquidityInfo.reserve0) / 1e18;
    const reserve1 = Number(pool.liquidityInfo.reserve1) / 1e18;
    const token0Price = token0Data?.priceUsd ? Number(token0Data.priceUsd) : 0;
    const token1Price = token1Data?.priceUsd ? Number(token1Data.priceUsd) : 0;

    const ratio0to1 = reserve1 > 0 ? reserve0 / reserve1 : 0;
    const ratio1to0 = reserve0 > 0 ? reserve1 / reserve0 : 0;

    return {
      reserve0,
      reserve1,
      token0Price,
      token1Price,
      ratio0to1,
      ratio1to0,
      totalLiquidity: reserve0 * token0Price + reserve1 * token1Price,
    };
  }, [pool, token0Data, token1Data]);

  // Loading state (modified from TokenDetail)
  if (loading) {
    return (
      <div className="pool-detail-layout" style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'var(--light-font-color)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 32,
            height: 32,
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid var(--accent-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading pool details...
        </div>
      </div>
    );
  }

  // Error state (modified from TokenDetail)
  if (error) {
    return (
      <div className="pool-detail-layout" style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '20px'
      }}>
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: 'var(--error-color)',
          background: 'rgba(255, 107, 107, 0.1)',
          borderRadius: 16,
          border: '1px solid rgba(255, 107, 107, 0.2)',
          backdropFilter: 'blur(10px)'
        }}>
          {error}
        </div>
      </div>
    );
  }

  // Main render (modified from TokenDetail)
  return (
    <div className="pool-detail-layout" style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: 24
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24
      }}>
        {/* Pool Detail Card (modified from Token Detail Card) */}
        <div className="genz-card" style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          backdropFilter: 'blur(20px)',
          borderRadius: 24,
          padding: 24,
          boxShadow: 'var(--glass-shadow)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Header (modified for pools) */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <TokenChip address={pool?.token0?.address || 'AE'} />
              <span style={{ fontSize: 24, color: 'var(--light-font-color)' }}>
                /
              </span>
              <TokenChip address={pool?.token1?.address || 'AE'} />
            </h1>
            <p style={{
              fontSize: 14,
              color: 'var(--light-font-color)',
              margin: '8px 0 0 0',
              lineHeight: 1.5
            }}>
              Liquidity pool details and statistics
            </p>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              fontFamily: 'monospace',
              opacity: 0.7,
              marginTop: 4
            }}>
              <AddressChip address={pool?.address || ''} />
            </div>
          </div>

          {/* Action Buttons (modified for pools) */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <AeButton onClick={() => navigate(`/dex/swap?from=${pool?.token0?.address}&to=${pool?.token1?.address}`)} variant="secondary-dark" size="medium">
              Swap
            </AeButton>
            <AeButton onClick={() => navigate(`/dex/pool?from=${pool?.token0?.address}&to=${pool?.token1?.address}`)} variant="secondary-dark" size="medium">
              Add Liquidity
            </AeButton>
            <AeButton onClick={() => navigate(`/dex/explore/tokens/${pool?.token0?.address}`)} variant="secondary-dark" size="medium">
              View {pool?.token0?.symbol || 'Token'}
            </AeButton>
            <AeButton onClick={() => navigate(`/dex/explore/tokens/${pool?.token1?.address}`)} variant="secondary-dark" size="medium">
              View {pool?.token1?.symbol || 'Token'}
            </AeButton>
          </div>

          {/* Pool Stats Overview (modified from Token Stats) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 16
          }}>
            {/* TVL Card */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(0, 255, 127, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: '1px solid rgba(0, 255, 127, 0.2)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                🏦 Total Value Locked
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--success-color)',
                marginBottom: 4,
                fontFamily: 'monospace'
              }}>
                ${poolStats ? Decimal.from(poolStats.totalLiquidity || 0).prettify(2) : '0'}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                Pool liquidity value
              </div>
            </div>

            {/* Volume Card */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: '1px solid rgba(138, 43, 226, 0.2)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                📊 Volume (24h)
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--accent-color)',
                marginBottom: 4,
                fontFamily: 'monospace'
              }}>
                $0
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                24h trading volume
              </div>
            </div>

            {/* Status Card (new for pools) */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: pool?.synchronized
                ? 'linear-gradient(135deg, rgba(0, 255, 127, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: pool?.synchronized
                ? '1px solid rgba(0, 255, 127, 0.2)'
                : '1px solid rgba(255, 107, 107, 0.2)',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                ⚡ Status
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: pool?.synchronized ? 'var(--success-color)' : 'var(--error-color)',
                marginBottom: 4,
                fontFamily: 'monospace'
              }}>
                {pool?.synchronized ? 'Active' : 'Inactive'}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                Pool information
              </div>
            </div>
          </div>

          {/* Pool Reserves (new for pools) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16
          }}>
            {/* Token 0 Reserve */}
            <div style={{
              padding: 18,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)',
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                🪙 {pool?.token0?.symbol || 'Token'} Reserve
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                marginBottom: 2
              }}>
                {formatTokenAmount(pool?.liquidityInfo?.reserve0 || 0)}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                ≈ ${poolStats ? formatNumber(poolStats.reserve0 * poolStats.token0Price) : '0'}
              </div>
            </div>

            {/* Token 1 Reserve */}
            <div style={{
              padding: 18,
              borderRadius: 14,
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)',
                marginBottom: 8,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                🪙 {pool?.token1?.symbol || 'Token'} Reserve
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                marginBottom: 2
              }}>
                {formatTokenAmount(pool?.liquidityInfo?.reserve1 || 0)}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                ≈ ${poolStats ? formatNumber(poolStats.reserve1 * poolStats.token1Price) : '0'}
              </div>
            </div>
          </div>
        </div>

        {pool?.address && (
          <PoolCandlestickChart
            pairAddress={pool.address}
            height={400}
          />
        )}
      </div>

      {/* Tabbed Card (modified from TokenDetail) */}
      <div className="genz-card" style={{
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(20px)',
        borderRadius: 24,
        padding: 24,
        boxShadow: 'var(--glass-shadow)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Tab Headers (modified for pools) */}
        <div style={{
          display: 'flex',
          marginBottom: 24,
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'overview' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'overview' ? 'var(--standard-font-color)' : 'var(--light-font-color)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Pool Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'transactions' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'transactions' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'transactions' ? 'var(--standard-font-color)' : 'var(--light-font-color)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Transactions ({history.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div>
            {/* Pool Composition (new for pools) */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(10px)',
              marginBottom: 20
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--standard-font-color)',
                margin: '0 0 16px 0'
              }}>
                Pool Composition
              </h3>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                gap: 20,
                alignItems: 'center'
              }}>
                {/* Token 0 Info */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--standard-font-color)',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <TokenChip address={pool?.token0?.address || 'AE'} />
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 4,
                    fontFamily: 'monospace'
                  }}>
                    {formatTokenAmount(pool?.liquidityInfo?.reserve0 || 0)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500
                  }}>
                    ≈ ${poolStats ? formatNumber(poolStats.reserve0 * poolStats.token0Price) : '0'}
                  </div>
                  {poolStats && poolStats.token0Price > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--light-font-color)',
                      marginTop: 4
                    }}>
                      ${poolStats.token0Price.toFixed(6)} per token
                    </div>
                  )}
                </div>

                {/* Ratio Display */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8
                }}>
                  <div style={{
                    fontSize: 24,
                    color: 'var(--accent-color)',
                    fontWeight: 700
                  }}>
                    ⚖️
                  </div>
                  {poolStats && (
                    <div style={{
                      fontSize: 12,
                      color: 'var(--light-font-color)',
                      textAlign: 'center',
                      lineHeight: 1.3
                    }}>
                      1 {pool?.token0?.symbol || 'Token'} = {poolStats.ratio0to1.toFixed(6)} {pool?.token1?.symbol || 'Token'}
                      <br />
                      1 {pool?.token1?.symbol || 'Token'} = {poolStats.ratio1to0.toFixed(6)} {pool?.token0?.symbol || 'Token'}
                    </div>
                  )}
                </div>

                {/* Token 1 Info */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--standard-font-color)',
                    marginBottom: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}>
                    <TokenChip address={pool?.token1?.address || 'AE'} />
                  </div>
                  <div style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--standard-font-color)',
                    marginBottom: 4,
                    fontFamily: 'monospace'
                  }}>
                    {formatTokenAmount(pool?.liquidityInfo?.reserve1 || 0)}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500
                  }}>
                    ≈ ${poolStats ? formatNumber(poolStats.reserve1 * poolStats.token1Price) : '0'}
                  </div>
                  {poolStats && poolStats.token1Price > 0 && (
                    <div style={{
                      fontSize: 11,
                      color: 'var(--light-font-color)',
                      marginTop: 4
                    }}>
                      ${poolStats.token1Price.toFixed(6)} per token
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Additional Pool Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 16
            }}>
              {/* LP Token Supply */}
              <div style={{
                padding: 18,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  fontSize: 10,
                  color: 'var(--light-font-color)',
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  🎫 LP Token Supply
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--standard-font-color)',
                  marginBottom: 2
                }}>
                  {formatTokenAmount(pool?.liquidityInfo?.totalSupply || 0)}
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--light-font-color)',
                  fontWeight: 500
                }}>
                  LP tokens in circulation
                </div>
              </div>

              {/* All-time Volume */}
              <div style={{
                padding: 18,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  fontSize: 10,
                  color: 'var(--light-font-color)',
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  📈 All-time Volume
                </div>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: 'var(--standard-font-color)',
                  marginBottom: 2
                }}>
                  $0
                </div>
                <div style={{
                  fontSize: 11,
                  color: 'var(--light-font-color)',
                  fontWeight: 500
                }}>
                  Total trading volume
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            {history.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: 40,
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 16,
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)'
              }}>
                <div style={{
                  fontSize: 48,
                  marginBottom: 16,
                  opacity: 0.3
                }}>
                  📊
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: 'var(--standard-font-color)'
                }}>
                  No transactions found
                </div>
                <div style={{
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  lineHeight: 1.5
                }}>
                  Trading activity for this pool will appear here
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.slice(0, 20).map((tx, index) => (
                  <TransactionCard
                    key={tx.hash || index}
                    transaction={tx}
                    getTransactionTokens={getTransactionTokens}
                  />
                ))}
                {history.length > 20 && (
                  <div style={{
                    textAlign: 'center',
                    padding: 12,
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    opacity: 0.8,
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: 12,
                    border: '1px dashed var(--glass-border)'
                  }}>
                    📈 +{history.length - 20} more transactions
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .pool-detail-layout > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
        
        @media (max-width: 768px) {
          .pool-detail-layout {
            padding: 16px !important;
            gap: 16px !important;
          }
          
          .pool-detail-layout .genz-card > div:nth-child(3),
          .pool-detail-layout .genz-card > div:nth-child(4) {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
        
        @media (max-width: 480px) {
          .pool-detail-layout .genz-card > div:nth-child(3),
          .pool-detail-layout .genz-card > div:nth-child(4) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
