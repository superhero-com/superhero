import React from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenTrades from '@/components/Trendminer/TokenTrades';

export const TokenTransactionsTab = ({ token }: { token: TokenDto }) => (
  <TokenTrades token={token} />
);

