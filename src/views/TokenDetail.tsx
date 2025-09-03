import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AddressChip } from '../components/AddressChip';
import AeButton from '../components/AeButton';
import { TokenChip } from '../components/TokenChip';
import { TransactionCard } from '../components/TransactionCard';
import { TokenPricePerformance } from '../features/dex/components';
import { useAeSdk } from '../hooks';
import { Decimal } from '../libs/decimal';
import { getHistory, getPairsByTokenUsd, getTokenWithUsd } from '../libs/dexBackend';
import moment from 'moment';

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

interface PairData {
  address: string;
  token0: string;
  token1: string;
  synchronized: boolean;
  transactions: number;
  tvlUsd: string;
  volumeUsdDay: string | null;
  volumeUsdWeek: string | null;
  volumeUsdMonth: string | null;
  volumeUsdYear: string;
  volumeUsdAll: string;
}

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

export default function TokenDetail() {
  const { activeNetwork } = useAeSdk()
  const { tokenAddress } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<TokenData | null>(null);
  const [tokenMetaData, setTokenMetaData] = useState<any | null>(null);
  const [pairsUsd, setPairsUsd] = useState<PairData[]>([]);
  const [history, setHistory] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pools' | 'transactions'>('pools');
  const [tokenSymbolCache, setTokenSymbolCache] = useState<Record<string, string>>({});


  async function getTokenMetaData(_tokenAddress: string) {
    const result = await fetch(`${activeNetwork.middlewareUrl}/v3/aex9/${_tokenAddress}`);
    const data = await result.json();
    return data;
  }

  // Function to get token symbol with caching
  const getTokenSymbol = useCallback(async (address: string): Promise<string> => {
    if (address === 'AE' || !address) return 'AE';
    
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

  // Get token symbol from cache (synchronous)
  const getCachedTokenSymbol = useCallback((address: string): string => {
    if (address === 'AE' || !address) return 'AE';
    return tokenSymbolCache[address] || address.slice(0, 6);
  }, [tokenSymbolCache]);

  // Get token symbols for a transaction based on pair address
  const getTransactionTokens = useCallback((tx: TransactionData): { token0Symbol: string, token1Symbol: string, token0Address: string, token1Address: string } => {
    if (!tx.pairAddress) {
      return {
        token0Symbol: 'Token A',
        token1Symbol: 'Token B',
        token0Address: '',
        token1Address: ''
      };
    }

    // Find the pair that matches this transaction
    const pair = pairsUsd.find(p => p.address === tx.pairAddress);
    if (pair) {
      return {
        token0Symbol: getCachedTokenSymbol(pair.token0),
        token1Symbol: getCachedTokenSymbol(pair.token1),
        token0Address: pair.token0,
        token1Address: pair.token1
      };
    }

    return {
      token0Symbol: 'Token A',
      token1Symbol: 'Token B', 
      token0Address: '',
      token1Address: ''
    };
  }, [pairsUsd, getCachedTokenSymbol]);

  useEffect(() => {
    (async () => {
      if (!tokenAddress) return;
      setLoading(true);
      setError(null);

      try {
        const [t, pUsd, hist, metaData] = await Promise.all([
          getTokenWithUsd(tokenAddress),
          getPairsByTokenUsd(tokenAddress),
          getHistory({ tokenAddress: tokenAddress }),
          getTokenMetaData(tokenAddress),
        ]);

        setToken(t);
        setPairsUsd(pUsd || []);
        setHistory(hist || []);
        setTokenMetaData(metaData);

        // Pre-populate token symbol cache with current token and AE
        const initialCache: Record<string, string> = {
          'AE': 'AE',
        };
        
        if (metaData?.symbol) {
          initialCache[tokenAddress] = metaData.symbol;
        }
        
        // Add symbols from pairs data
        if (pUsd) {
          for (const pair of pUsd) {
            // We know one token is the current token, try to identify the other
            if (pair.token0 === tokenAddress && metaData?.symbol) {
              initialCache[pair.token0] = metaData.symbol;
            } else if (pair.token1 === tokenAddress && metaData?.symbol) {
              initialCache[pair.token1] = metaData.symbol;
            }
          }
        }
        
        setTokenSymbolCache(initialCache);

        // Asynchronously fetch symbols for other tokens in pairs
        if (pUsd) {
          pUsd.forEach(async (pair) => {
            const addresses = [pair.token0, pair.token1].filter(addr => 
              addr !== tokenAddress && addr !== 'AE' && !initialCache[addr]
            );
            
            for (const addr of addresses) {
              try {
                const tokenMeta = await getTokenMetaData(addr);
                if (tokenMeta?.symbol) {
                  setTokenSymbolCache(prev => ({
                    ...prev,
                    [addr]: tokenMeta.symbol
                  }));
                }
              } catch (error) {
                // Fallback to shortened address
                setTokenSymbolCache(prev => ({
                  ...prev,
                  [addr]: addr.slice(0, 6)
                }));
              }
            }
          });
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load token data');
      } finally {
        setLoading(false);
      }
    })();
  }, [tokenAddress]);

  const formatNumber = (num: number | string | undefined, decimals = 2) => {
    const n = Number(num || 0);
    if (n === 0) return '0';
    if (n < 0.01) return '< 0.01';
    if (n < 1000) return n.toFixed(decimals);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
    return `${(n / 1000000000).toFixed(1)}B`;
  };

  const totalSupply = useMemo(() => {
    if (!tokenMetaData) return Decimal.ZERO;
    return Decimal.from(tokenMetaData?.event_supply).div(10 ** tokenMetaData?.decimals);
  }, [tokenMetaData]);

  const formatTokenAmount = (amount: string | number | undefined, decimals = 18) => {
    const n = Number(amount || 0);
    if (n === 0) return '0';
    const units = n / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="token-detail-layout" style={{
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
          Loading token details...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="token-detail-layout" style={{
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

  return (
    <div className="token-detail-layout" style={{
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
        {/* Token Detail Card */}
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
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1 style={{
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--standard-font-color)',
              margin: '0 0 8px 0',
              background: 'var(--primary-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {token ? `${token.symbol} / ${token.name}` : 'Loading token…'}
            </h1>
            <p style={{
              fontSize: 14,
              color: 'var(--light-font-color)',
              margin: 0,
              lineHeight: 1.5
            }}>
              Token details and statistics
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <AeButton onClick={() => navigate(`/dex/swap?from=AE&to=${tokenAddress}`)} variant="secondary-dark" size="medium">
              Swap
            </AeButton>
            <AeButton onClick={() => navigate(`/dex/pool?from=AE&to=${tokenAddress}`)} variant="secondary-dark" size="medium">
              Add Liquidity
            </AeButton>
          </div>

          {/* Token Stats Overview */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 16
          }}>
            {/* Price Card */}
            <div style={{
              padding: 20,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
              border: '1px solid rgba(255, 107, 107, 0.2)',
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
                💰 Price
              </div>
              <div style={{
                fontSize: 24,
                fontWeight: 800,
                color: 'var(--standard-font-color)',
                marginBottom: 4,
                fontFamily: 'monospace'
              }}>
                ${Decimal.from(token?.priceUsd || 0).prettify()}
              </div>
              {token?.priceChangeDay && (
                <div style={{
                  fontSize: 12,
                  color: Number(token.priceChangeDay) >= 0 ? 'var(--success-color)' : 'var(--error-color)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  {Number(token.priceChangeDay) >= 0 ? '📈' : '📉'}
                  {Number(token.priceChangeDay) >= 0 ? '+' : ''}{Number(token.priceChangeDay).toFixed(2)}% (24h)
                </div>
              )}
            </div>

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
                ${Decimal.from(token?.tvlUsd || 0).prettify(2)}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                Across {token?.pairs || 0} pool{token?.pairs !== 1 ? 's' : ''}
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
                ${Decimal.from(token?.volumeUsdDay || 0).prettify()}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                24h trading volume
              </div>
            </div>
          </div>

          {/* Secondary Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16
          }}>
            {/* Locked Tokens */}
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
                🔒 Locked
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                marginBottom: 2
              }}>
                {Decimal.from(token?.totalReserve || 0).prettify(2)}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                {token?.symbol} tokens
              </div>
            </div>

            {/* Total Supply */}
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
                🪙 Total Supply
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                marginBottom: 2
              }}>
                {totalSupply.prettify()}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                {token?.symbol} tokens
              </div>
            </div>

            {/* Market Cap (VFD) */}
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
                💎 Market Cap
              </div>
              <div style={{
                fontSize: 18,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                marginBottom: 2
              }}>
                ${totalSupply.mul(token?.priceUsd || 0).prettify()}
              </div>
              <div style={{
                fontSize: 11,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                Fully diluted value
              </div>
            </div>
          </div>
        </div>

        {/* Price Performance Chart Card */}
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
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16
          }}>
            <h3 style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              margin: 0
            }}>
              Price Performance
            </h3>
          </div>

          <div style={{ marginTop: 8 }}>
            <TokenPricePerformance
              availableGraphTypes={[
                { type: 'Price', text: 'Price' },
                { type: 'Volume', text: 'Volume' },
                { type: 'TVL', text: 'Total Value Locked' },
                { type: 'Fees', text: 'Fees' }
              ]}
              initialChart={{ type: 'Price', text: 'Price' }}
              initialTimeFrame="1Y"
              tokenId={tokenAddress}
              className="token-detail-chart"
            />
          </div>
        </div>
      </div>

      {/* Second Row - Tabbed Card */}
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
        {/* Tab Headers */}
        <div style={{
          display: 'flex',
          marginBottom: 24,
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <button
            onClick={() => setActiveTab('pools')}
            style={{
              padding: '12px 24px',
              background: activeTab === 'pools' ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'pools' ? '2px solid var(--accent-color)' : '2px solid transparent',
              color: activeTab === 'pools' ? 'var(--standard-font-color)' : 'var(--light-font-color)',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              borderRadius: '8px 8px 0 0'
            }}
          >
            Pools ({pairsUsd.length})
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
        {activeTab === 'pools' && (
          <div>
            {pairsUsd.length === 0 ? (
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
                  🏊‍♂️
                </div>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  marginBottom: 8,
                  color: 'var(--standard-font-color)'
                }}>
                  No liquidity pools found
                </div>
                <div style={{
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  lineHeight: 1.5
                }}>
                  This token doesn't have any active liquidity pools yet
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pairsUsd.map((pair) => (
                  <div
                    key={pair.address}
                    style={{
                      padding: 20,
                      borderRadius: 16,
                      background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                      border: '1px solid var(--glass-border)',
                      backdropFilter: 'blur(10px)',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => navigate(`/dex/pools/${pair.address}`)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.05) 100%)';
                      e.currentTarget.style.transform = 'translateY(-3px)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.borderColor = 'var(--glass-border)';
                    }}
                  >
                    {/* Status Indicator */}
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: pair.synchronized ? 'var(--success-color)' : 'var(--error-color)',
                        boxShadow: pair.synchronized ? '0 0 8px rgba(0, 255, 127, 0.4)' : '0 0 8px rgba(255, 107, 107, 0.4)'
                      }}></div>
                      <span style={{
                        fontSize: 10,
                        color: pair.synchronized ? 'var(--success-color)' : 'var(--error-color)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                      }}>
                        {pair.synchronized ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Pool Header */}
                    <div style={{
                      marginBottom: 16
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 8
                      }}>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: 'var(--standard-font-color)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <TokenChip address={pair.token0} />
                          <span style={{ fontSize: 18, color: 'var(--light-font-color)' }}>
                            /
                          </span>
                          <TokenChip address={pair.token1} />
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11,
                        color: 'var(--light-font-color)',
                        fontFamily: 'monospace',
                        opacity: 0.7
                      }}>
                        <AddressChip address={pair.address} />
                      </div>
                    </div>

                    {/* Pool Stats Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 16,
                      marginBottom: 16
                    }}>
                      {/* TVL */}
                      <div>
                        <div style={{
                          fontSize: 10,
                          color: 'var(--light-font-color)',
                          marginBottom: 4,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          💰 TVL
                        </div>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--success-color)',
                          fontFamily: 'monospace'
                        }}>
                          ${Decimal.from(pair.tvlUsd).prettify(2)}
                        </div>
                      </div>

                      {/* Volume (24h) */}
                      <div>
                        <div style={{
                          fontSize: 10,
                          color: 'var(--light-font-color)',
                          marginBottom: 4,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          📊 Volume (24h)
                        </div>
                        <div style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: 'var(--accent-color)',
                          fontFamily: 'monospace'
                        }}>
                          ${pair.volumeUsdDay ? Decimal.from(pair.volumeUsdDay).prettify(2) : '0'}
                        </div>
                      </div>
                    </div>

                    {/* Additional Stats Row */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: 12,
                      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{
                          fontSize: 10,
                          color: 'var(--light-font-color)',
                          fontWeight: 600
                        }}>
                          🔄 {pair.transactions.toLocaleString()} txs
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <span style={{
                          fontSize: 10,
                          color: 'var(--light-font-color)',
                          fontWeight: 600
                        }}>
                          📈 All-time: ${Decimal.from(pair.volumeUsdAll).prettify()}
                        </span>
                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.02) 100%)',
                      pointerEvents: 'none',
                      opacity: 0,
                      transition: 'opacity 0.3s ease'
                    }}></div>
                  </div>
                ))}
              </div>
            )}
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
                  Trading activity for this token will appear here
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {history.slice(0, 10).map((tx, index) => (
                  <TransactionCard
                    key={tx.hash || index}
                    transaction={tx}
                    getTransactionTokens={getTransactionTokens}
                  />
                ))}
                {history.length > 10 && (
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
                    📈 +{history.length - 10} more transactions
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add responsive styles */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 1024px) {
          .token-detail-layout > div:first-child {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
        }
        
        @media (max-width: 768px) {
          .token-detail-layout {
            padding: 16px !important;
            gap: 16px !important;
          }
          
          /* Stack stats vertically on mobile */
          .token-detail-layout .genz-card > div:nth-child(3),
          .token-detail-layout .genz-card > div:nth-child(4) {
            grid-template-columns: 1fr !important;
            gap: 12px !important;
          }
        }
        
        @media (max-width: 480px) {
          /* Single column on very small screens */
          .token-detail-layout .genz-card > div:nth-child(3),
          .token-detail-layout .genz-card > div:nth-child(4) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}


