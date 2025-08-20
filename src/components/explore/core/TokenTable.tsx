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
      <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
        Loading tokens...
      </div>
    );
  }

  return (
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
          value={sort.key} 
          onChange={(e) => handleSort(e.target.value as any)}
          style={{ 
            padding: '6px 8px', 
            borderRadius: 6, 
            background: '#1a1a23', 
            color: 'white', 
            border: '1px solid #3a3a4a' 
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
            borderRadius: 6, 
            border: '1px solid #3a3a4a', 
            background: '#2a2a39', 
            color: 'white' 
          }}
        >
          {sort.asc ? '↑' : '↓'}
        </button>
        <input 
          placeholder="Filter tokens" 
          value={search} 
          onChange={(e) => onSearchChange(e.target.value)}
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

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #3a3a4a' }}>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Symbol</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Name</th>
            <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Address</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Pools</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Decimals</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Price (USD)</th>
            <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>24h Vol</th>
            <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tokens.map((token) => (
            <tr key={token.address} style={{ borderBottom: '1px solid #1a1a23' }}>
              <td style={{ padding: '12px 8px' }}>
                <button
                  onClick={() => handleTokenClick(token)}
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
                  #{token.symbol}
                </button>
              </td>
              <td style={{ padding: '12px 8px', fontSize: 14 }}>#{token.name}</td>
              <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                {CONFIG.EXPLORER_URL ? (
                  <a 
                    href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/contracts/${token.address}`} 
                    target="_blank" 
                    rel="noreferrer" 
                    style={{ color: '#8bc9ff', textDecoration: 'underline' }}
                  >
                    {token.address}
                  </a>
                ) : token.address}
              </td>
              <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: 14 }}>
                {token.pairs || 0}
              </td>
              <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: 14 }}>
                {token.decimals}
              </td>
              <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                {token.priceUsd != null ? Number(token.priceUsd).toFixed(4) : '-'}
              </td>
              <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                {token.volume24h != null ? Number(token.volume24h).toLocaleString() : '-'}
              </td>
              <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <button 
                    onClick={() => handleSwapClick(token)}
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
                    onClick={() => handleAddClick(token)}
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

      {tokens.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
          No tokens found
        </div>
      )}
    </div>
  );
}
