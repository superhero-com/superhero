import React, { useState } from 'react';
import DexTabs from '../components/dex/DexTabs';
import TokenTable from '../components/explore/components/TokenListTable';
import { useTokenList } from '../components/explore/hooks/useTokenList';
import { usePairList } from '../components/explore/hooks/usePairList';
import { useTransactionList } from '../components/explore/hooks/useTransactionList';
import { CONFIG } from '../config';

export default function ExploreRefactored() {
  const [active, setActive] = useState<'Tokens' | 'Pairs' | 'Transactions'>('Tokens');
  
  // Hooks for different data types
  const tokenList = useTokenList();
  const pairList = usePairList();
  const transactionList = useTransactionList();

  return (
    <div className="max-w-[1400px] mx-auto p-5">
      <DexTabs />
      
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[32px] font-bold text-white m-0 mb-2">
          Explore
        </h1>
        <p className="text-base text-white/80 m-0 leading-relaxed">
          Discover tokens, pools, and track transactions across the æternity ecosystem
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-0.5 mb-6 border-b border-gray-600">
        <button
          onClick={() => setActive('Tokens')}
          className={`px-6 py-3 border-none cursor-pointer text-base font-semibold transition-all ${
            active === 'Tokens' 
              ? 'bg-gray-800 text-white border-b-2 border-green-500' 
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          Tokens
        </button>
        <button
          onClick={() => setActive('Pairs')}
          className={`px-6 py-3 border-none cursor-pointer text-base font-semibold transition-all ${
            active === 'Pairs' 
              ? 'bg-gray-800 text-white border-b-2 border-green-500' 
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          Pools
        </button>
        <button
          onClick={() => setActive('Transactions')}
          className={`px-6 py-3 border-none cursor-pointer text-base font-semibold transition-all ${
            active === 'Transactions' 
              ? 'bg-gray-800 text-white border-b-2 border-green-500' 
              : 'bg-transparent text-gray-400 hover:text-white'
          }`}
        >
          Transactions
        </button>
      </div>

      {/* Content */}
      {active === 'Tokens' && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white m-0 mb-2">
              All Tokens
            </h2>
            <p className="text-sm text-white/70 m-0">
              Browse and interact with all available tokens on æternity
            </p>
          </div>
          
          <TokenTable
            tokens={tokenList.tokens}
            sort={tokenList.sort}
            onSortChange={tokenList.toggleSort}
            search={tokenList.search}
            onSearchChange={tokenList.setSearch}
            loading={tokenList.loading}
          />
        </div>
      )}

      {active === 'Pairs' && (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-white m-0 mb-2">
              Liquidity Pools
            </h2>
            <p className="text-sm text-white/70 m-0">
              Explore trading pairs and their performance metrics
            </p>
          </div>
          
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
                        onClick={() => window.location.href = `/explore/tokens/${pair.token0 || pair.token0Address}`}
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
                        onClick={() => window.location.href = `/explore/tokens/${pair.token1 || pair.token1Address}`}
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
                        onClick={() => window.location.href = `/explore/pools/${pair.address}`}
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
                          onClick={() => window.location.href = `/swap?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
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
                          onClick={() => window.location.href = `/pool/add?from=${pair.token0 || pair.token0Address}&to=${pair.token1 || pair.token1Address}`}
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
      )}

      {active === 'Transactions' && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ 
              fontSize: 20, 
              fontWeight: 600, 
              color: 'white', 
              margin: '0 0 8px 0' 
            }}>
              Recent Transactions
            </h2>
            <p style={{ 
              fontSize: 14, 
              opacity: 0.7, 
              margin: 0 
            }}>
              Track recent swaps, liquidity additions, and removals
            </p>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            {/* Controls */}
            <div style={{ 
              display: 'flex', 
              gap: 8, 
              alignItems: 'center', 
              marginBottom: 16 
            }}>
              <label style={{ fontSize: 12, opacity: 0.85 }}>Type</label>
              <select 
                value={transactionList.type} 
                onChange={(e) => transactionList.setType(e.target.value as any)}
                style={{ 
                  padding: '6px 8px', 
                  borderRadius: 6, 
                  background: '#1a1a23', 
                  color: 'white', 
                  border: '1px solid #3a3a4a' 
                }}
              >
                <option value="all">All</option>
                <option value="swap">Swaps</option>
                <option value="add">Adds</option>
                <option value="remove">Removes</option>
              </select>
              <label style={{ fontSize: 12, opacity: 0.85, marginLeft: 8 }}>Window</label>
              <select 
                value={transactionList.window} 
                onChange={(e) => transactionList.setWindow(e.target.value as any)}
                style={{ 
                  padding: '6px 8px', 
                  borderRadius: 6, 
                  background: '#1a1a23', 
                  color: 'white', 
                  border: '1px solid #3a3a4a' 
                }}
              >
                <option value="24h">24h</option>
                <option value="7d">7d</option>
              </select>
            </div>

            {/* Transactions Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #3a3a4a' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Type</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Pair</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Amount In</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Amount Out</th>
                  <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 12, opacity: 0.8 }}>Transaction</th>
                </tr>
              </thead>
              <tbody>
                {transactionList.transactions.map((tx, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a23' }}>
                    <td style={{ padding: '12px 8px', fontSize: 14 }}>
                      <span style={{ 
                        padding: '2px 6px', 
                        borderRadius: 4, 
                        fontSize: 12,
                        fontWeight: 600,
                        background: tx.type === 'swap' ? '#4caf50' : tx.type === 'add' ? '#2196f3' : '#ff9800',
                        color: 'white'
                      }}>
                        {tx.type || tx.event || '-'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14 }}>
                      {tx.tokenInSymbol || tx.token0Symbol} / {tx.tokenOutSymbol || tx.token1Symbol}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                      {tx.amountIn || '-'}
                    </td>
                    <td style={{ textAlign: 'right', padding: '12px 8px', fontSize: 14 }}>
                      {tx.amountOut || '-'}
                    </td>
                    <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 12 }}>
                      {tx.txHash && CONFIG.EXPLORER_URL ? (
                        <a 
                          href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${tx.txHash}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ color: '#8bc9ff', textDecoration: 'underline' }}
                        >
                          {tx.txHash}
                        </a>
                      ) : (tx.txHash || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transactionList.transactions.length === 0 && !transactionList.loading && (
              <div style={{ textAlign: 'center', padding: 40, opacity: 0.7 }}>
                No transactions found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
