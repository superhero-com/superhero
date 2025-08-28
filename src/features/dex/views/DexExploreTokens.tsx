import React from 'react';
import TokenTable from '../../../components/explore/core/TokenTable';
import { useTokenList } from '../../../components/explore/hooks/useTokenList';
import './DexViews.scss';

export default function DexExploreTokens() {
  const tokenList = useTokenList();

  return (
    <div className="dex-explore-tokens-container">
      {/* Header */}
      <div className="dex-page-header">
        <h1 className="dex-page-title">Explore Tokens</h1>
        <p className="dex-page-description">
          Browse and interact with all available tokens on the æternity ecosystem.
        </p>
      </div>

      {/* Main Content */}
      <div className="dex-explore-tokens-content">
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
