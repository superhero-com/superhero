import React from 'react';
import TokenTable from '../../../components/explore/core/TokenTable';
import { useTokenList } from '../../../components/explore/hooks/useTokenList';
import { useQuery } from '@tanstack/react-query';
import { DexService } from '../../../api/generated';

export default function DexExploreTokens() {
  const tokenList = useTokenList();
  const { data, isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => DexService.listAllDexTokens({
      page: 1,
      limit: 100,
      orderBy: 'market_cap',
      orderDirection: 'DESC',
      search: '',
    }),
  });

  return (
    <div className="p-0">
      {/* Main Content Card */}
      <div className="max-w-[1200px] mx-2 md:mx-auto bg-glass-bg border border-glass-border backdrop-blur-[20px] rounded-2xl md:rounded-[24px] p-4 md:p-6 shadow-glass relative overflow-hidden">
        {/* Header Card */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-standard-font-color m-0 mb-3 bg-primary-gradient bg-clip-text text-transparent">
            Explore Tokens
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Browse and interact with all available tokens on the æternity ecosystem.
          </p>
        </div>
        <TokenTable
          tokens={data?.items ?? []}
          sort={tokenList.sort}
          onSortChange={tokenList.toggleSort}
          search={tokenList.search}
          onSearchChange={tokenList.setSearch}
          loading={tokenList.loading}
        />
        <pre>
          {
            JSON.stringify(data, null, 2)
          }
        </pre>
      </div>
    </div>
  );
}
