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
      {/* Controls */}
      <div style={{ 
        display: 'flex', 
        gap: 12, 
        alignItems: 'center', 
        marginBottom: 24,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ 
            fontSize: 14, 
            color: 'var(--light-font-color)',
            fontWeight: 500
          }}>Sort by</label>
          <select 
            value={sort.key} 
            onChange={(e) => handleSort(e.target.value as any)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: 12, 
              background: 'var(--glass-bg)', 
              color: 'var(--standard-font-color)', 
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(10px)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
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
              padding: '8px 12px', 
              borderRadius: 12, 
              border: '1px solid var(--glass-border)', 
              background: 'var(--glass-bg)', 
              color: 'var(--standard-font-color)',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease',
              fontSize: 14,
              fontWeight: 600,
              minWidth: 40
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'var(--accent-color)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'var(--glass-bg)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {sort.asc ? '↑' : '↓'}
          </button>
        </div>
        
        <input 
          placeholder="Filter tokens..." 
          value={search} 
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ 
            marginLeft: 'auto', 
            padding: '8px 16px', 
            borderRadius: 12, 
            background: 'var(--glass-bg)', 
            color: 'var(--standard-font-color)', 
            border: '1px solid var(--glass-border)',
            backdropFilter: 'blur(10px)',
            minWidth: 250,
            fontSize: 14,
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
        />
      </div>

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
