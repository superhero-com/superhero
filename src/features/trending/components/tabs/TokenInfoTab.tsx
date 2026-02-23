import React from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenChat from '@/components/Trendminer/TokenChat';
import { TokenSummary } from '@/features/bcl/components';
import TokenRanking from '../TokenRanking/TokenRanking';

export const TokenInfoTab = ({ token }: { token: TokenDto }) => (
  <div className="space-y-4 px-1">
    <TokenSummary
      token={{ ...token, decimals: String(token.decimals ?? '') as any }}
    />
    <TokenRanking token={token} />
    <TokenChat
      token={{
        name: String(token.name || token.symbol || ''),
        address: String((token as any).sale_address || (token as any).address || (token as any).token_address || ''),
      }}
      mode="ctaOnly"
    />
  </div>
);
