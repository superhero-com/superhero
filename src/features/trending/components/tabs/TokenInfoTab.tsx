import React from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenCommunityChatButton from '@/features/chat/components/TokenCommunityChatButton';
import { TokenSummary } from '@/features/bcl/components';
import TokenRanking from '../TokenRanking/TokenRanking';

export const TokenInfoTab = ({ token }: { token: TokenDto }) => {
  const saleAddress = String((token as any).sale_address || (token as any).address || (token as any).token_address || '');
  return (
    <div className="space-y-4 px-1">
      <TokenSummary
        showOverview={false}
        token={{ ...token, decimals: String(token.decimals ?? '') as any }}
      />
      <TokenRanking token={token} />
      <TokenCommunityChatButton saleAddress={saleAddress} symbol={token.symbol} />
    </div>
  );
};
