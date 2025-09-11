import React, { useState } from 'react';
import { CONFIG } from '../../../config';
import { TokenChip } from '../../../components/TokenChip';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DexService, PairDto } from '../../../api/generated';

// Define the actual API response structure
interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
  };
}

export default function DexExplorePools() {
  const navigate = useNavigate();

  const [sort, setSort] = useState<'transactions_count' | 'created_at'>('transactions_count');
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryFn: async () => {
      const result = await DexService.listAllPairs({
        page: page,
        limit: limit,
        orderBy: sort,
        orderDirection: sortDirection,
        search,
      });
      return result as unknown as PaginatedResponse<PairDto>;
    },
    queryKey: ['DexService.listAllPairs', sort, sortDirection, search, page, limit],
  })
  return (
    <div className="p-0">
      {/* Main Content Card */}
      <div className="max-w-[1200px] mx-2 md:mx-auto bg-glass-bg border border-glass-border backdrop-blur-[20px] rounded-2xl md:rounded-[24px] p-4 md:p-6 shadow-glass relative overflow-hidden">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-standard-font-color m-0 mb-3 bg-primary-gradient bg-clip-text text-transparent">
            Explore Pools
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Explore trading pairs and their performance metrics across the DEX.
          </p>
        </div>

        <div className="overflow-x-auto">
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
                      value={sort}
                      onChange={(e) => setSort(e.target.value as any)}
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
                      <option value="transactions_count">Tx count</option>
                      <option value="created_at">Created at</option>
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
                    onClick={() => setSortDirection(sortDirection === 'ASC' ? 'DESC' : 'ASC')}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--glass-border)',
                      background: sortDirection === 'ASC' ? 'var(--accent-color)' : 'var(--glass-bg)',
                      color: sortDirection === 'ASC' ? 'white' : 'var(--standard-font-color)',
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
                      if (sortDirection !== 'ASC') {
                        e.currentTarget.style.background = 'var(--accent-color)';
                        e.currentTarget.style.color = 'white';
                      }
                      e.currentTarget.style.transform = 'translateY(-1px) scale(1.05)';
                      e.currentTarget.style.boxShadow = '0 3px 8px rgba(76, 175, 80, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      if (sortDirection !== 'ASC') {
                        e.currentTarget.style.background = 'var(--glass-bg)';
                        e.currentTarget.style.color = 'var(--standard-font-color)';
                      }
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    title={sortDirection === 'ASC' ? 'Sort Ascending' : 'Sort Descending'}
                  >
                    {sortDirection === 'ASC' ? '↑' : '↓'}
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
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
                {search && (
                  <button
                    onClick={() => setSearch('')}
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

              {/* Center Right: Items per page */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0
              }}>
                <span style={{
                  fontSize: 13,
                  color: 'var(--light-font-color)',
                  fontWeight: 500
                }}>
                  Show:
                </span>
                <div style={{
                  position: 'relative',
                  display: 'inline-block'
                }}>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1); // Reset to first page when changing limit
                    }}
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
                      minWidth: 70,
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
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
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
                  {data?.meta.totalItems} {data?.meta.totalItems === 1 ? 'pool' : 'pools'}
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
                  }}>Volume</th>
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
                {data?.items.map((pair: PairDto) => (
                  <tr key={pair.address} style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'all 0.3s ease'
                  }}
                    onClick={() => navigate(`/dex/explore/pools/${pair.address}`)}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px 12px', display: 'flex', alignItems: 'center', gap: 2 }}>
                      <button
                        onClick={() => navigate(`/dex/explore/tokens/${pair.token0}`)}
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
                        <TokenChip token={pair.token0} />
                      </button>
                      <span style={{
                        color: 'var(--light-font-color)',
                        margin: '0 4px',
                        fontSize: 14
                      }}>/</span>
                      <button
                        onClick={() => navigate(`/dex/explore/tokens/${pair.token1}`)}
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
                        <TokenChip token={pair.token1} />
                      </button>
                    </td>
                    <td style={{
                      textAlign: 'center',
                      padding: '16px 12px',
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      {pair.transactions_count || 0}
                    </td>
                    <td style={{
                      textAlign: 'right',
                      padding: '16px 12px',
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      -
                    </td>
                    <td style={{
                      textAlign: 'right',
                      padding: '16px 12px',
                      fontSize: 14,
                      color: 'var(--standard-font-color)',
                      fontWeight: 500
                    }}>
                      -
                    </td>
                    <td style={{ textAlign: 'center', padding: '16px 12px' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => navigate(`/dex/swap?from=${pair.token0.address}&to=${pair.token1.address}`)}
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
                          onClick={() => navigate(`/dex/pool/add?from=${pair.token0.address}&to=${pair.token1.address}`)}
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

          {/* Pagination Controls */}
          {data && data.meta.totalItems > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              padding: '16px 20px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--glass-border)',
              borderRadius: 16,
              backdropFilter: 'blur(10px)'
            }}>
              {/* Left: Pagination Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{
                  fontSize: 14,
                  color: 'var(--light-font-color)',
                  fontWeight: 500
                }}>
                  Showing {((page - 1) * limit) + 1}-{Math.min(page * limit, data.meta.totalItems)} of {data.meta.totalItems} pools
                </span>
              </div>

              {/* Right: Pagination Buttons */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {/* First Page Button */}
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: page === 1 ? 'rgba(255, 255, 255, 0.05)' : 'var(--glass-bg)',
                    color: page === 1 ? 'var(--light-font-color)' : 'var(--standard-font-color)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (page !== 1) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (page !== 1) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                      e.currentTarget.style.color = 'var(--standard-font-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  title="First page"
                >
                  ⇤ First
                </button>

                {/* Previous Page Button */}
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: page === 1 ? 'rgba(255, 255, 255, 0.05)' : 'var(--glass-bg)',
                    color: page === 1 ? 'var(--light-font-color)' : 'var(--standard-font-color)',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    opacity: page === 1 ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (page !== 1) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (page !== 1) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                      e.currentTarget.style.color = 'var(--standard-font-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  title="Previous page"
                >
                  ← Prev
                </button>

                {/* Page Number Display */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '0 12px'
                }}>
                  <span style={{
                    fontSize: 14,
                    color: 'var(--standard-font-color)',
                    fontWeight: 600,
                    background: 'rgba(76, 175, 80, 0.1)',
                    padding: '4px 8px',
                    borderRadius: 6,
                    border: '1px solid rgba(76, 175, 80, 0.2)'
                  }}>
                    {page}
                  </span>
                  <span style={{
                    fontSize: 14,
                    color: 'var(--light-font-color)'
                  }}>
                    of {Math.ceil(data.meta.totalItems / limit)}
                  </span>
                </div>

                {/* Next Page Button */}
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page >= Math.ceil(data.meta.totalItems / limit)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: page >= Math.ceil(data.meta.totalItems / limit) ? 'rgba(255, 255, 255, 0.05)' : 'var(--glass-bg)',
                    color: page >= Math.ceil(data.meta.totalItems / limit) ? 'var(--light-font-color)' : 'var(--standard-font-color)',
                    cursor: page >= Math.ceil(data.meta.totalItems / limit) ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    opacity: page >= Math.ceil(data.meta.totalItems / limit) ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (page < Math.ceil(data.meta.totalItems / limit)) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (page < Math.ceil(data.meta.totalItems / limit)) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                      e.currentTarget.style.color = 'var(--standard-font-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  title="Next page"
                >
                  Next →
                </button>

                {/* Last Page Button */}
                <button
                  onClick={() => setPage(Math.ceil(data.meta.totalItems / limit))}
                  disabled={page >= Math.ceil(data.meta.totalItems / limit)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--glass-border)',
                    background: page >= Math.ceil(data.meta.totalItems / limit) ? 'rgba(255, 255, 255, 0.05)' : 'var(--glass-bg)',
                    color: page >= Math.ceil(data.meta.totalItems / limit) ? 'var(--light-font-color)' : 'var(--standard-font-color)',
                    cursor: page >= Math.ceil(data.meta.totalItems / limit) ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    opacity: page >= Math.ceil(data.meta.totalItems / limit) ? 0.5 : 1
                  }}
                  onMouseOver={(e) => {
                    if (page < Math.ceil(data.meta.totalItems / limit)) {
                      e.currentTarget.style.background = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (page < Math.ceil(data.meta.totalItems / limit)) {
                      e.currentTarget.style.background = 'var(--glass-bg)';
                      e.currentTarget.style.color = 'var(--standard-font-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                  title="Last page"
                >
                  Last ⇥
                </button>
              </div>
            </div>
          )}

          {data?.items.length === 0 && !isLoading && (
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
