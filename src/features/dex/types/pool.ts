import type { PairDto } from '@/api/generated';

export interface LiquidityPosition {
  pair: PairDto;
  token0: string;
  token1: string;
  balance: string;
  sharePct?: string;
  valueUsd?: string;
}

export interface AddLiquidityState {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  symbolA: string;
  symbolB: string;
  decA: number;
  decB: number;
  loading: boolean;
  error: string | null;
  pairPreview: {
    ratioAinB?: string;
    ratioBinA?: string;
    sharePct?: string;
    lpMintEstimate?: string;
    suggestedAmountA?: string;
    suggestedAmountB?: string;
  } | null;
  reserves: {
    reserveA?: bigint;
    reserveB?: bigint;
  } | null;
  pairExists: boolean;
  linkAmounts: boolean;
  showConfirm: boolean;
  showSettings: boolean;
  allowanceInfo: string | null;
}

export interface PoolListState {
  positions: LiquidityPosition[];
  loading: boolean;
  error: string | null;
  showImport: boolean;
  showCreate: boolean;
}

export interface LiquidityExecutionParams {
  tokenA: string;
  tokenB: string;
  symbolA?: string;
  symbolB?: string;
  amountA: string;
  amountB: string;
  slippagePct: number;
  deadlineMins: number;
  isAePair: boolean;
}

export interface RemoveLiquidityExecutionParams {
  tokenA: string;
  tokenB: string;
  tokenASymbol?: string;
  tokenBSymbol?: string;
  liquidity: string; // LP tokens to remove
  liquidityPct?: string;
  slippagePct: number;
  deadlineMins: number;
  isAePair: boolean;
}
