import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Token } from '../types/explore';
import { CONFIG } from '../../../config';

interface TokenTableProps {
  tokens: Token[];
  sort: { key: 'symbol' | 'name' | 'pairs' | 'decimals'; asc: boolean };
  onSortChange: (key: 'symbol' | 'name' | 'pairs' | 'decimals') => void;
  search: string;
  onSearchChange: (value: string) => void;
  loading: boolean;
}

export default function TokenTable({ 
  tokens, 
  sort, 
  onSortChange, 
  search, 
  onSearchChange, 
  loading 
}: TokenTableProps) {
  const navigate = useNavigate();

  const handleSort = (key: 'symbol' | 'name' | 'pairs' | 'decimals') => {
    onSortChange(key);
  };

  const handleTokenClick = (token: Token) => {
    navigate(`/explore/tokens/${token.address}`);
  };

  const handleSwapClick = (token: Token) => {
    navigate(`/swap?from=AE&to=${token.address}`);
  };

  const handleAddClick = (token: Token) => {
    navigate(`/pool/add?from=AE&to=${token.address}`);
  };

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: 60,
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          color: 'var(--light-font-color)',
          fontSize: 16,
          fontWeight: 500
        }}>
          <div style={{
            width: 20,
            height: 20,
            border: '2px solid rgba(76, 175, 80, 0.3)',
            borderTop: '2px solid var(--accent-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          Loading tokens...
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      {/* Enhanced Filter Controls */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid var(--glass-border)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        backdropFilter: 'blur(15px)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Filter Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
          gap: 8
        }}>
          <div style={{
            width: 4,
            height: 20,
            background: 'var(--primary-gradient)',
            borderRadius: 2
          }}></div>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--standard-font-color)',
            margin: 0,
            background: 'var(--primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Filter & Sort Tokens
          </h3>
        </div>

        {/* Filter Controls Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'auto 1fr auto',
          gap: 16,
          alignItems: 'center'
        }}>
          {/* Sort Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '8px 12px',
              borderRadius: 12,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <span style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Sort
              </span>
              <div style={{
                width: 1,
                height: 16,
                background: 'var(--glass-border)'
              }}></div>
              <select 
                value={sort.key} 
                onChange={(e) => handleSort(e.target.value as any)}
                style={{ 
                  padding: '6px 10px', 
                  borderRadius: 8, 
                  background: 'var(--glass-bg)', 
                  color: 'var(--standard-font-color)', 
                  border: '1px solid var(--glass-border)',
                  backdropFilter: 'blur(10px)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  outline: 'none'
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
                <option value="symbol">Symbol</option>
                <option value="name">Name</option>
                <option value="pairs">Pools</option>
                <option value="decimals">Decimals</option>
              </select>
              <button 
                onClick={() => handleSort(sort.key)}
                style={{ 
                  padding: '6px 8px', 
                  borderRadius: 8, 
                  border: '1px solid var(--glass-border)', 
                  background: sort.asc ? 'var(--accent-color)' : 'var(--glass-bg)', 
                  color: sort.asc ? 'white' : 'var(--standard-font-color)',
                  cursor: 'pointer',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontSize: 14,
                  fontWeight: 600,
                  minWidth: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  outline: 'none'
                }}
                onMouseOver={(e) => {
                  if (!sort.asc) {
                    e.currentTarget.style.background = 'var(--accent-color)';
                    e.currentTarget.style.color = 'white';
                  }
                  e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(76, 175, 80, 0.3)';
                }}
                onMouseOut={(e) => {
                  if (!sort.asc) {
                    e.currentTarget.style.background = 'var(--glass-bg)';
                    e.currentTarget.style.color = 'var(--standard-font-color)';
                  }
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                title={sort.asc ? 'Sort Ascending' : 'Sort Descending'}
              >
                {sort.asc ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--light-font-color)',
              fontSize: 16,
              pointerEvents: 'none',
              opacity: 0.6,
              zIndex: 1
            }}>
              🔍
            </div>
            <input 
              placeholder="Search tokens by name, symbol, or address..." 
              value={search} 
              onChange={(e) => onSearchChange(e.target.value)}
              style={{ 
                width: '100%',
                padding: '10px 16px 10px 40px', 
                borderRadius: 12, 
                background: 'var(--glass-bg)', 
                color: 'var(--standard-font-color)', 
                border: '1px solid var(--glass-border)',
                backdropFilter: 'blur(10px)',
                fontSize: 14,
                fontWeight: 400,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-color)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(76, 175, 80, 0.1)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--glass-bg)';
              }}
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--light-font-color)',
                  fontSize: 12,
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

          {/* Filter Stats */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(76, 175, 80, 0.1)',
            padding: '6px 12px',
            borderRadius: 20,
            border: '1px solid rgba(76, 175, 80, 0.2)'
          }}>
            <div style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-color)',
              animation: 'pulse 2s infinite'
            }}></div>
            <span style={{
              fontSize: 12,
              color: 'var(--accent-color)',
              fontWeight: 600
            }}>
              {tokens.length} token{tokens.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Active Filters Display */}
        {(search || sort.key !== 'symbol') && (
          <div style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap'
            }}>
              <span style={{
                fontSize: 12,
                color: 'var(--light-font-color)',
                fontWeight: 500
              }}>
                Active filters:
              </span>
              {search && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(76, 175, 80, 0.15)',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(76, 175, 80, 0.3)'
                }}>
                  <span>Search: "{search}"</span>
                  <button
                    onClick={() => onSearchChange('')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-color)',
                      cursor: 'pointer',
                      fontSize: 10,
                      padding: 0,
                      outline: 'none'
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
              {sort.key !== 'symbol' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  background: 'rgba(76, 175, 80, 0.15)',
                  padding: '4px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  color: 'var(--accent-color)',
                  border: '1px solid rgba(76, 175, 80, 0.3)'
                }}>
                  <span>Sort: {sort.key} {sort.asc ? '↑' : '↓'}</span>
                </div>
              )}
            </div>
          </div>
        )}
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

      {/* Table */}
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
              }}>Symbol</th>
              <th style={{ 
                textAlign: 'left', 
                padding: '16px 12px', 
                fontSize: 14, 
                color: 'var(--light-font-color)',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>Name</th>
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
              }}>Pools</th>
              <th style={{ 
                textAlign: 'center', 
                padding: '16px 12px', 
                fontSize: 14, 
                color: 'var(--light-font-color)',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>Decimals</th>
              <th style={{ 
                textAlign: 'right', 
                padding: '16px 12px', 
                fontSize: 14, 
                color: 'var(--light-font-color)',
                fontWeight: 600,
                letterSpacing: '0.5px'
              }}>Price (USD)</th>
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
            {tokens.map((token) => (
              <tr key={token.address} style={{ 
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
                    onClick={() => handleTokenClick(token)}
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
                    {token.symbol}
                  </button>
                </td>
                <td style={{ 
                  padding: '16px 12px', 
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  fontWeight: 500
                }}>{token.name}</td>
                <td style={{ 
                  padding: '16px 12px', 
                  fontFamily: 'monospace', 
                  fontSize: 12,
                  color: 'var(--light-font-color)'
                }}>
                  {CONFIG.EXPLORER_URL ? (
                    <a 
                      href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${token.address}`} 
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
                      {token.address}
                    </a>
                  ) : token.address}
                </td>
                <td style={{ 
                  textAlign: 'center', 
                  padding: '16px 12px', 
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  fontWeight: 500
                }}>
                  {token.pairs || 0}
                </td>
                <td style={{ 
                  textAlign: 'center', 
                  padding: '16px 12px', 
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  fontWeight: 500
                }}>
                  {token.decimals}
                </td>
                <td style={{ 
                  textAlign: 'right', 
                  padding: '16px 12px', 
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  fontWeight: 500
                }}>
                  {token.priceUsd != null ? `$${Number(token.priceUsd).toFixed(4)}` : '-'}
                </td>
                <td style={{ 
                  textAlign: 'right', 
                  padding: '16px 12px', 
                  fontSize: 14,
                  color: 'var(--standard-font-color)',
                  fontWeight: 500
                }}>
                  {token.volume24h != null ? `$${Number(token.volume24h).toLocaleString()}` : '-'}
                </td>
                <td style={{ textAlign: 'center', padding: '16px 12px' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button 
                      onClick={() => handleSwapClick(token)}
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
                      onClick={() => handleAddClick(token)}
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

      {tokens.length === 0 && !loading && (
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
            No tokens found
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
  );
}
