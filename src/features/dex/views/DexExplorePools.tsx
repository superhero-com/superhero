import React from 'react';
import { usePairList } from '../../../components/explore/hooks/usePairList';
import { CONFIG } from '../../../config';
import './DexViews.scss';

export default function DexExplorePools() {
  const pairList = usePairList();

  return (
    <div className="dex-explore-pools-container">
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
            Explore Pools
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--light-font-color)',
            margin: 0,
            opacity: 0.8,
            lineHeight: 1.5
          }}>
            Explore trading pairs and their performance metrics across the DEX.
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
                    Filter & Sort
                  </span>
                </div>
                
                {/* Enhanced Dropdown Container */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <div style={{
                    position: 'relative',
                    display: 'inline-block'
                  }}>
                    <select 
                      value={pairList.sort.key} 
                      onChange={(e) => pairList.toggleSort(e.target.value as any)}
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
                        minWidth: 100,
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
                      <option value="transactions">Tx count</option>
                      <option value="pair">Pair</option>
                      <option value="address">Address</option>
                    </select>
                    {/* Custom Dropdown Arrow */}
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
                  
                  <button 
                    onClick={() => pairList.toggleSort(pairList.sort.key)}
                    style={{ 
                      padding: '6px 8px', 
                      borderRadius: 6, 
                      border: '1px solid var(--glass-border)', 
                      background: pairList.sort.asc ? 'var(--accent-color)' : 'var(--glass-bg)', 
                      color: pairList.sort.asc ? 'white' : 'var(--standard-font-color)',
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
                      outline: 'none'
                    }}
                    onMouseOver={(e) => {
                      if (!pairList.sort.asc) {
                        e.currentTarget.style.background = 'var(--accent-color)';
                        e.currentTarget.style.color = 'white';
                      }
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      if (!pairList.sort.asc) {
                        e.currentTarget.style.background = 'var(--glass-bg)';
                        e.currentTarget.style.color = 'var(--standard-font-color)';
                      }
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title={pairList.sort.asc ? 'Sort Ascending' : 'Sort Descending'}
                  >
                    {pairList.sort.asc ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {/* Center: Search Input */}
              <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
                <div style={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--light-font-color)',
                  fontSize: 14,
                  pointerEvents: 'none',
                  opacity: 0.6,
                  zIndex: 1
                }}>
                  🔍
                </div>
                <input 
                  placeholder="Search pools..." 
                  value={pairList.search} 
                  onChange={(e) => pairList.setSearch(e.target.value)}
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
                    boxSizing: 'border-box'
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
                {pairList.search && (
                  <button
                    onClick={() => pairList.setSearch('')}
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
                      outline: 'none'
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
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
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
                  {pairList.pairs.length} {pairList.pairs.length === 1 ? 'pool' : 'pools'}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Pools Table */}
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
                  }}>Pair</th>
                  <th style={{ 
                    textAlign: 'left', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Address</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Tx</th>
                  <th style={{ 
                    textAlign: 'right', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>TVL (USD)</th>
                  <th style={{ 
                    textAlign: 'right', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>24h Vol</th>
                  <th style={{ 
                    textAlign: 'center', 
                    padding: '16px 12px', 
                    fontSize: 14, 
                    color: 'var(--light-font-color)',
                    fontWeight: 600,
                    letterSpacing: '0.5px'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pairList.pairs.map((pair) => (
                  <tr key={pair.address} style={{ 
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
                    <td style={{ padding: '16px 12px' }}>
                      <button
                        onClick={() => window.location.href = `/dex/explore/tokens/${pair.token0 || pair.token0Address}`}
                        style={{ 
                          color: 'var(--accent-color)', 
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 15,
                          fontWeight: 600,
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {pair.token0Symbol}
                      </button>
                      <span style={{ 
                        color: 'var(--light-font-color)', 
                        margin: '0 4px',
                        fontSize: 14
                      }}>/</span>
                      <button
                        onClick={() => window.location.href = `/dex/explore/tokens/${pair.token1 || pair.token1Address}`}
                        style={{ 
                          color: 'var(--accent-color)', 
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: 15,
                          fontWeight: 600,
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        {pair.token1Symbol}
                      </button>
                    </td>
                    <td style={{ 
                      padding: '16px 12px', 
                      fontFamily: 'monospace', 
                      fontSize: 12,
                      color: 'var(--light-font-color)'
                    }}>
                      <button
                        onClick={() => window.location.href = `/dex/explore/pools/${pair.address}`}
                        style={{ 
                          color: 'var(--accent-color)', 
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          marginRight: 8,
                          fontSize: 12,
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        {pair.address}
                      </button>
                      {CONFIG.EXPLORER_URL && (
                        <a 
                          href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${pair.address}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ 
                            color: 'var(--accent-color)', 
                            textDecoration: 'none',
                            fontSize: 12,
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.textDecoration = 'underline';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.textDecoration = 'none';
                          }}
                        >
                          View
                        </a>
                      )}
                    </td>
                    <td style={{ 
                      textAlign: 'center', 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {pair.transactions || 0}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {pair.tvlUsd != null ? `$${Number(pair.tvlUsd).toLocaleString()}` : (pair.tvl != null ? `$${Number(pair.tvl).toLocaleString()}` : '-')}
                    </td>
                    <td style={{ 
                      textAlign: 'right', 
                      padding: '16px 12px', 
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {pair.volume24h != null ? `$${Number(pair.volume24h).toLocaleString()}` : '-'}
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button 
                          onClick={() => window.location.href = `/dex/swap?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
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
                            transition: 'all 0.3s ease'
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
                          Swap
                        </button>
                        <button 
                          onClick={() => window.location.href = `/dex/pool/add?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
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
                            transition: 'all 0.3s ease'
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
                          Add
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pairList.pairs.length === 0 && !pairList.loading && (
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
                No pools found
              </div>
              <div style={{
                color: 'var(--light-font-color)',
                fontSize: 14,
                opacity: 0.7
              }}>
                Try adjusting your search criteria
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
