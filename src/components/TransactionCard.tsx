import React from 'react';
import { useAeSdk } from '../hooks';

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

interface TransactionCardProps {
  transaction: TransactionData;
  getTransactionTokens: (tx: TransactionData) => {
    token0Symbol: string;
    token1Symbol: string;
  };
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction: tx,
  getTransactionTokens
}) => {
  const { activeNetwork } = useAeSdk();

  // Format number utility (copied from TokenDetail)
  const formatNumber = (num: number | string | undefined, decimals = 2) => {
    const n = Number(num || 0);
    if (n === 0) return '0';
    if (n < 0.01) return '< 0.01';
    if (n < 1000) return n.toFixed(decimals);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
    return `${(n / 1000000000).toFixed(1)}B`;
  };

  return (
    <div
      style={{
        padding: 16,
        borderRadius: 16,
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(0, 255, 157, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 157, 0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Transaction Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
      }}>
        <div style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--standard-font-color)'
        }}>
          {tx.type === 'SwapTokens' ? `Swap ${getTransactionTokens(tx).token0Symbol} → ${getTransactionTokens(tx).token1Symbol}` :
           tx.type === 'PairMint' ? `Add Liquidity ${getTransactionTokens(tx).token0Symbol} / ${getTransactionTokens(tx).token1Symbol}` :
           tx.type === 'CreatePair' ? `Create ${getTransactionTokens(tx).token0Symbol} / ${getTransactionTokens(tx).token1Symbol} Pool` :
           tx.type || 'Transaction'}
        </div>
        {tx.microBlockTime && (
          <div style={{
            fontSize: 12,
            color: 'var(--light-font-color)'
          }}>
            {new Date(Number(tx.microBlockTime) * 1000).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Swap Details */}
      {tx.type === 'SwapTokens' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          gap: 12,
          alignItems: 'center',
          padding: 12,
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 8
        }}>
          {/* Token In */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              marginBottom: 2,
              fontWeight: 600
            }}>
              FROM
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--error-color)',
              fontFamily: 'monospace',
              marginBottom: 4
            }}>
              -{tx.deltaReserve0 ? formatNumber(Math.abs(Number(tx.deltaReserve0)) / 1e18, 6) : '—'}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              background: 'rgba(255, 107, 107, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-block'
            }}>
              {getTransactionTokens(tx).token0Symbol}
            </div>
            {tx.delta0UsdValue && (
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)',
                marginTop: 2
              }}>
                ≈ ${formatNumber(Number(tx.delta0UsdValue), 2)}
              </div>
            )}
          </div>

          {/* Arrow */}
          <div style={{
            fontSize: 20,
            color: 'var(--accent-color)',
            fontWeight: 700
          }}>
            →
          </div>

          {/* Token Out */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              marginBottom: 2,
              fontWeight: 600
            }}>
              TO
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--success-color)',
              fontFamily: 'monospace',
              marginBottom: 4
            }}>
              +{tx.deltaReserve1 ? formatNumber(Math.abs(Number(tx.deltaReserve1)) / 1e18, 6) : '—'}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              background: 'rgba(0, 255, 157, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-block'
            }}>
              {getTransactionTokens(tx).token1Symbol}
            </div>
            {tx.delta1UsdValue && (
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)',
                marginTop: 2
              }}>
                ≈ ${formatNumber(Number(tx.delta1UsdValue), 2)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Liquidity Addition Details */}
      {tx.type === 'PairMint' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          padding: 12,
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 12,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 8
        }}>
          {/* Reserve 0 */}
          <div>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              marginBottom: 2,
              fontWeight: 600
            }}>
              {getTransactionTokens(tx).token0Symbol} ADDED
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--success-color)',
              fontFamily: 'monospace',
              marginBottom: 4
            }}>
              +{tx.deltaReserve0 ? formatNumber(Math.abs(Number(tx.deltaReserve0)) / 1e18, 6) : '—'}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              background: 'rgba(0, 255, 157, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-block',
              marginBottom: 2
            }}>
              {getTransactionTokens(tx).token0Symbol}
            </div>
            {tx.reserve0 && (
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)'
              }}>
                Pool: {formatNumber(Number(tx.reserve0) / 1e18, 2)}
              </div>
            )}
          </div>

          {/* Reserve 1 */}
          <div>
            <div style={{
              fontSize: 11,
              color: 'var(--light-font-color)',
              marginBottom: 2,
              fontWeight: 600
            }}>
              {getTransactionTokens(tx).token1Symbol} ADDED
            </div>
            <div style={{
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--success-color)',
              fontFamily: 'monospace',
              marginBottom: 4
            }}>
              +{tx.deltaReserve1 ? formatNumber(Math.abs(Number(tx.deltaReserve1)) / 1e18, 6) : '—'}
            </div>
            <div style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--standard-font-color)',
              background: 'rgba(0, 255, 157, 0.1)',
              padding: '2px 6px',
              borderRadius: 6,
              display: 'inline-block',
              marginBottom: 2
            }}>
              {getTransactionTokens(tx).token1Symbol}
            </div>
            {tx.reserve1 && (
              <div style={{
                fontSize: 10,
                color: 'var(--light-font-color)'
              }}>
                Pool: {formatNumber(Number(tx.reserve1) / 1e18, 2)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Pair Details */}
      {tx.type === 'CreatePair' && (
        <div style={{
          padding: 12,
          background: 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(255, 255, 255, 0.02) 100%)',
          borderRadius: 12,
          border: '1px solid rgba(138, 43, 226, 0.2)',
          marginBottom: 8
        }}>
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--accent-color)',
            marginBottom: 8,
            textAlign: 'center'
          }}>
            🎉 New Trading Pair Created
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            gap: 12,
            alignItems: 'center'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                background: 'rgba(138, 43, 226, 0.15)',
                padding: '4px 8px',
                borderRadius: 8,
                display: 'inline-block'
              }}>
                {getTransactionTokens(tx).token0Symbol}
              </div>
              {tx.reserve0 && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--light-font-color)',
                  marginTop: 4
                }}>
                  {formatNumber(Number(tx.reserve0) / 1e18, 4)}
                </div>
              )}
            </div>
            
            <div style={{
              fontSize: 16,
              color: 'var(--accent-color)',
              fontWeight: 700
            }}>
              ⚡
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--standard-font-color)',
                background: 'rgba(138, 43, 226, 0.15)',
                padding: '4px 8px',
                borderRadius: 8,
                display: 'inline-block'
              }}>
                {getTransactionTokens(tx).token1Symbol}
              </div>
              {tx.reserve1 && (
                <div style={{
                  fontSize: 11,
                  color: 'var(--light-font-color)',
                  marginTop: 4
                }}>
                  {formatNumber(Number(tx.reserve1) / 1e18, 4)}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Total Transaction Value */}
      {(tx.delta0UsdValue || tx.delta1UsdValue || tx.txUsdFee) && (
        <div style={{
          padding: 8,
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 8,
          border: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            fontSize: 11,
            color: 'var(--light-font-color)',
            fontWeight: 600
          }}>
            Transaction Value:
          </div>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--accent-color)',
            fontFamily: 'monospace'
          }}>
            ${formatNumber((Number(tx.delta0UsdValue || 0) + Number(tx.delta1UsdValue || 0)), 2)}
            {tx.txUsdFee && (
              <span style={{
                fontSize: 10,
                color: 'var(--light-font-color)',
                marginLeft: 8
              }}>
                (Fee: ${formatNumber(Number(tx.txUsdFee), 4)})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Transaction Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        {tx.hash && (
          <div 
            style={{
              fontSize: 10,
              color: 'var(--accent-color)',
              fontFamily: 'monospace',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 6,
              background: 'rgba(0, 255, 157, 0.05)',
              border: '1px solid rgba(0, 255, 157, 0.1)',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              if (activeNetwork?.explorerUrl) {
                window.open(`${activeNetwork.explorerUrl}/transactions/${tx.hash}`, '_blank');
              }
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 157, 0.1)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 157, 0.05)';
            }}
          >
            📋 {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
          </div>
        )}
        
        {tx.pairAddress && (
          <div style={{
            fontSize: 10,
            color: 'var(--light-font-color)',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            🏊 Pool: {tx.pairAddress.slice(0, 6)}...{tx.pairAddress.slice(-4)}
          </div>
        )}
      </div>
    </div>
  );
};
