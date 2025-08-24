import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

type ProvidedLiquidity = Record<string, { balance: string; token0: string; token1: string } | undefined>;

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
export const providedLiquidityAtom = atom<Record<string, ProvidedLiquidity>>({});
export const poolInfoAtom = atom<Record<string, { totalSupply: string | null; reserveA: string; reserveB: string } | undefined>>({});
