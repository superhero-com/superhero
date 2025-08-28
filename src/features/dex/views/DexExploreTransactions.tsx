import React from 'react';
import { useTransactionList } from '../../../components/explore/hooks/useTransactionList';
import { CONFIG } from '../../../config';
import './DexViews.scss';

export default function DexExploreTransactions() {
  const transactionList = useTransactionList();

  return (
    <div className="dex-explore-transactions-container">
      {/* Main Content Card */}
      <div className="genz-card" style={{
        maxWidth: 1200,
        margin: '0 auto',
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
        <div style={{
          marginBottom: 24
        }}>
          <h1 style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--standard-font-color)',
            margin: '0 0 12px 0',
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Explore Transactions
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--light-font-color)',
            margin: 0,
            opacity: 0.8,
            lineHeight: 1.5
          }}>
            Track recent swaps, liquidity additions, and removals across the DEX.
          </p>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {/* Compact Filter Controls */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--glass-border)',
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 20,
            backdropFilter: 'blur(15px)',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
          }}>
            {/* Compact Filter Layout */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap'
            }}>
              {/* Left: Filter & Sort Label + Controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <div style={{
                    width: 3,
                    height: 16,
                    background: 'var(--primary-gradient)',
                    borderRadius: 2
                  }}></div>
                  <span style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--standard-font-color)',
                    background: 'var(--primary-gradient)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    Filter Transactions
                  </span>
                </div>
                
                {/* Type Dropdown */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500
                  }}>Type:</span>
                  <div style={{
                    position: 'relative',
                    display: 'inline-block'
                  }}>
                    <select 
                      value={transactionList.type} 
                      onChange={(e) => transactionList.setType(e.target.value as any)}
                      style={{ 
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        padding: '6px 28px 6px 12px', 
                        borderRadius: 8, 
                        background: 'var(--glass-bg)', 
                        color: 'var(--standard-font-color)', 
                        border: '1px solid var(--glass-border)',
                        backdropFilter: 'blur(10px)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        minWidth: 80,
                        backgroundImage: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="all">All</option>
                      <option value="swap">Swaps</option>
                      <option value="add">Adds</option>
                      <option value="remove">Removes</option>
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--light-font-color)',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 4,
                      transition: 'all 0.3s ease'
                    }}>
                      ▼
                    </div>
                  </div>
                  
                  <span style={{
                    fontSize: 12,
                    color: 'var(--light-font-color)',
                    fontWeight: 500,
                    marginLeft: 8
                  }}>Window:</span>
                  <div style={{
                    position: 'relative',
                    display: 'inline-block'
                  }}>
                    <select 
                      value={transactionList.window} 
                      onChange={(e) => transactionList.setWindow(e.target.value as any)}
                      style={{ 
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        padding: '6px 28px 6px 12px', 
                        borderRadius: 8, 
                        background: 'var(--glass-bg)', 
                        color: 'var(--standard-font-color)', 
                        border: '1px solid var(--glass-border)',
                        backdropFilter: 'blur(10px)',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        minWidth: 60,
                        backgroundImage: 'none'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <option value="24h">24h</option>
                      <option value="7d">7d</option>
                    </select>
                    <div style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                      color: 'var(--light-font-color)',
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 16,
                      height: 16,
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 4,
                      transition: 'all 0.3s ease'
                    }}>
                      ▼
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Results Counter */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'rgba(76, 175, 80, 0.1)',
                padding: '6px 10px',
                borderRadius: 16,
                border: '1px solid rgba(76, 175, 80, 0.2)',
                flexShrink: 0
              }}>
                <div style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: 'var(--accent-color)',
                  animation: 'pulse 2s infinite'
                }}></div>
                <span style={{
                  fontSize: 11,
                  color: 'var(--accent-color)',
                  fontWeight: 600
                }}>
                  {transactionList.transactions.length} {transactionList.transactions.length === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Transactions Table */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--glass-border)',
            borderRadius: 16,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ 
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderBottom: '1px solid var(--glass-border)'
                }}>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Type</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Pair</th>
                  <th style={{ 
                    textAlign: 'right', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Amount In</th>
                  <th style={{ 
                    textAlign: 'right', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Amount Out</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {transactionList.transactions.map((tx, i) => (
                  <tr key={i} style={{ 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  >
                    <td style={{ padding: '16px 12px', fontSize: 14 }}>
                      <span style={{ 
                        padding: '4px 8px', 
                        borderRadius: 8, 
                        fontSize: 11,
                        fontWeight: 600,
                        background: tx.type === 'swap' ? 'var(--accent-color)' : tx.type === 'add' ? '#2196f3' : '#ff9800',
                        color: 'white',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        {tx.type || tx.event || '-'}
                      </span>
                    </td>
                    <td style={{ 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {tx.tokenInSymbol || tx.token0Symbol} / {tx.tokenOutSymbol || tx.token1Symbol}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {tx.amountIn || '-'}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {tx.amountOut || '-'}
                    </td>
                    <td style={{ 
                      padding: '16px 12px', 
                      fontFamily: 'monospace', 
                      fontSize: 12,
                      color: 'var(--light-font-color)'
                    }}>
                      {tx.txHash && CONFIG.EXPLORER_URL ? (
                        <a 
                          href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${tx.txHash}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            color: 'var(--accent-color)', 
                            textDecoration: 'none',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          {tx.txHash}
                        </a>
                      ) : (tx.txHash || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactionList.transactions.length === 0 && !transactionList.loading && (
            <div style={{ 
              textAlign: 'center', 
              padding: 60,
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              backdropFilter: 'blur(10px)',
              marginTop: 20
            }}>
              <div style={{
                color: 'var(--light-font-color)',
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 8
              }}>
                No transactions found
              </div>
              <div style={{
                color: 'var(--light-font-color)',
                fontSize: 14,
                opacity: 0.7
              }}>
                Try adjusting your filter criteria
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add keyframes for pulse animation */}
      <style>{`
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
      `}</style>
    </div>
  );
}
