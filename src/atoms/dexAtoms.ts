/* eslint-disable max-len */
import {
  createClampedNumberJSONStorage,
  safeLocalJSONStorage,
  type SyncJSONNumberStorage,
} from '@/utils/jotaiSafeLocalStorage';
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { DexTokenDto } from '@/api/generated';

// Import RecentActivity type
import type { RecentActivity } from '../components/dex/types/dex';

type LiquidityPositionData = {
  balance: string;
  token0: DexTokenDto;
  token1: DexTokenDto;
  sharePct?: string;
  valueUsd?: string;
};

const dexSlippagePctStorage = createClampedNumberJSONStorage(safeLocalJSONStorage as SyncJSONNumberStorage, {
  min: 0,
  max: 50,
  writeFallback: 5,
});

const dexDeadlineMinsStorage = createClampedNumberJSONStorage(safeLocalJSONStorage as SyncJSONNumberStorage, {
  min: 1,
  max: 60,
  writeFallback: 30,
});

// DEX settings (quota-safe persistence; clamped on read/write and in useDex on write)
export const slippagePctAtom = atomWithStorage<number>('dex:slippage', 5, dexSlippagePctStorage);

export const deadlineMinsAtom = atomWithStorage<number>('dex:deadline', 30, dexDeadlineMinsStorage);

// DEX state atoms
// Structure: {[accountAddress]: {[pairAddress]: LiquidityPositionData}}
export const providedLiquidityAtom = atom<Record<string, Record<string, LiquidityPositionData>>>({});

// Recent activities with localStorage persistence
// Structure: {[accountAddress]: RecentActivity[]}
export const recentActivitiesAtom = atomWithStorage<Record<string, RecentActivity[]>>(
  'dex:recentActivities',
  {},
  safeLocalJSONStorage,
);
