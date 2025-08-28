import React from 'react';
import { useTransactionList } from '../../../components/explore/hooks/useTransactionList';
import { CONFIG } from '../../../config';
import './DexViews.scss';

export default function DexExploreTransactions() {
  const transactionList = useTransactionList();

  return (
    <div className="dex-explore-transactions-container">
      {/* Header */}
      <div className="dex-page-header">
        <h1 className="dex-page-title">Explore Transactions</h1>
        <p className="dex-page-description">
          Track recent swaps, liquidity additions, and removals across the DEX.
        </p>
      </div>

      {/* Main Content */}
      <div className="dex-explore-transactions-content">
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
    </div>
  );
}
