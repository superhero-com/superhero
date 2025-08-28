import React from 'react';
import TokenTable from '../../../components/explore/core/TokenTable';
import { useTokenList } from '../../../components/explore/hooks/useTokenList';
import './DexViews.scss';

export default function DexExploreTokens() {
  const tokenList = useTokenList();

  return (
    <div className="dex-explore-tokens-container">


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
        {/* Header Card */}
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
            Explore Tokens
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--light-font-color)',
            margin: 0,
            opacity: 0.8,
            lineHeight: 1.5
          }}>
            Browse and interact with all available tokens on the æternity ecosystem.
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
    </div>
  );
}
