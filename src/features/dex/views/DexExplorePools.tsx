import React from 'react';
import { usePairList } from '../../../components/explore/hooks/usePairList';
import { CONFIG } from '../../../config';
import './DexViews.scss';

export default function DexExplorePools() {
  const pairList = usePairList();

  return (
    <div className="dex-explore-pools-container">
      {/* Header */}
      <div className="dex-page-header">
        <h1 className="dex-page-title">Explore Pools</h1>
        <p className="dex-page-description">
          Explore trading pairs and their performance metrics across the DEX.
        </p>
      </div>

      {/* Main Content */}
      <div className="dex-explore-pools-content">
        <div style={{ overflowX: 'auto' }}>
          {/* Controls */}
          <div style={{ 
            display: 'flex', 
            gap: 8, 
            alignItems: 'center', 
            marginBottom: 16 
          }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>Sort by</label>
            <select 
              value={pairList.sort.key} 
              onChange={(e) => pairList.toggleSort(e.target.value as any)}
              style={{ 
                padding: '6px 8px', 
                borderRadius: 6, 
                background: '#1a1a23', 
                color: 'white', 
                border: '1px solid #3a3a4a' 
              }}
            >
              <option value="transactions">Tx count</option>
              <option value="pair">Pair</option>
              <option value="address">Address</option>
            </select>
            <button 
              onClick={() => pairList.toggleSort(pairList.sort.key)}
              style={{ 
                padding: '6px 8px', 
                borderRadius: 6, 
                border: '1px solid #3a3a4a', 
                background: '#2a2a39', 
                color: 'white' 
              }}
            >
              {pairList.sort.asc ? '↑' : '↓'}
            </button>
            <input 
              placeholder="Filter pools" 
              value={pairList.search} 
              onChange={(e) => pairList.setSearch(e.target.value)}
              style={{ 
                marginLeft: 'auto', 
                padding: '6px 8px', 
                borderRadius: 6, 
                background: '#1a1a23', 
                color: 'white', 
                border: '1px solid #3a3a4a',
                minWidth: 200
              }} 
            />
          </div>

          {/* Pairs Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #3a3a4a' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Pair</th>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Address</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Tx</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>TVL (USD)</th>
                <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>24h Vol</th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pairList.pairs.map((pair) => (
                <tr key={pair.address} style={{ borderBottom: '1px solid #1a1a23' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <button
                      onClick={() => window.location.href = `/dex/explore/tokens/${pair.token0 || pair.token0Address}`}
                      style={{ 
                        color: 'white', 
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      {pair.token0Symbol}
                    </button>
                    {' / '}
                    <button
                      onClick={() => window.location.href = `/dex/explore/tokens/${pair.token1 || pair.token1Address}`}
                      style={{ 
                        color: 'white', 
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      {pair.token1Symbol}
                    </button>
                  </td>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                    <button
                      onClick={() => window.location.href = `/dex/explore/pools/${pair.address}`}
                      style={{ 
                        color: 'white', 
                        textDecoration: 'underline',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        marginRight: 8
                      }}
                    >
                      {pair.address}
                    </button>
                    {CONFIG.EXPLORER_URL && (
                      <a 
                        href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${pair.address}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        style={{ color: '#8bc9ff', textDecoration: 'underline' }}
                      >
                        View
                      </a>
                    )}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: 14 }}>
                    {pair.transactions || 0}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                    {pair.tvlUsd != null ? Number(pair.tvlUsd).toLocaleString() : (pair.tvl != null ? Number(pair.tvl).toLocaleString() : '-')}
                  </td>
                  <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                    {pair.volume24h != null ? Number(pair.volume24h).toLocaleString() : '-'}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      <button 
                        onClick={() => window.location.href = `/dex/swap?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: 6, 
                          border: '1px solid #3a3a4a', 
                          background: '#2a2a39', 
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 12
                        }}
                      >
                        Swap
                      </button>
                      <button 
                        onClick={() => window.location.href = `/dex/pool/add?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
                        style={{ 
                          padding: '4px 8px', 
                          borderRadius: 6, 
                          border: '1px solid #3a3a4a', 
                          background: '#2a2a39', 
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: 12
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

          {pairList.pairs.length === 0 && !pairList.loading && (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
              No pools found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
