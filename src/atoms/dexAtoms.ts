/* eslint-disable max-len */
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { DexTokenDto } from '@/api/generated';

// Import RecentActivity type
import type { RecentActivity } from '../components/dex/types/dex';

// Type for individual liquidity position data
export type LiquidityPositionData = {
  balance: string;
  token0: DexTokenDto;
  token1: DexTokenDto;
  sharePct?: string;
  valueUsd?: string;
};

// DEX settings with localStorage persistence
export const slippagePctAtom = atomWithStorage<number>('dex:slippage', (() => {
  try {
    const v = localStorage.getItem('dex:slippage');
    return v != null ? Math.max(0, Math.min(50, Number(v) || 5)) : 5;
  } catch {
    return 5;
  }
})());

export const deadlineMinsAtom = atomWithStorage<number>('dex:deadline', (() => {
  try {
    const v = localStorage.getItem('dex:deadline');
    return v != null ? Math.max(1, Math.min(60, Number(v) || 30)) : 30;
  } catch {
    return 30;
  }
})());

// DEX state atoms
// Structure: {[accountAddress]: {[pairAddress]: LiquidityPositionData}}
export const providedLiquidityAtom = atom<Record<string, Record<string, LiquidityPositionData>>>({});
export const poolInfoAtom = atom<Record<string, { totalSupply: string | null; reserveA: string; reserveB: string } | undefined>>({});

// Recent activities with localStorage persistence
// Structure: {[accountAddress]: RecentActivity[]}
export const recentActivitiesAtom = atomWithStorage<Record<string, RecentActivity[]>>('dex:recentActivities', {});
