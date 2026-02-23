import React from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenHolders from '@/components/Trendminer/TokenHolders';

export const TokenHoldersTab = ({ token }: { token: TokenDto }) => (
  <TokenHolders token={token} />
);
