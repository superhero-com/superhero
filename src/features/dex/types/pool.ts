import { PairDto } from '@/api/generated';

export interface LiquidityPosition {
  pair: PairDto;
  token0: string;
  token1: string;
  balance: string;
  sharePct?: string;
  valueUsd?: string;
}

export interface PoolInfo {
  address: string;
  token0: string;
  token1: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  tvlUsd?: string;
  volume24h?: string;
  transactions?: number;
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

export interface RemoveLiquidityState {
  pairId: string;
  lpAmount: string;
  token0Amount: string;
  token1Amount: string;
  loading: boolean;
  error: string | null;
  showConfirm: boolean;
  pairInfo: PoolInfo | null;
}

export interface PoolListState {
  positions: LiquidityPosition[];
  loading: boolean;
  error: string | null;
  showImport: boolean;
  showCreate: boolean;
}

export interface PoolSettings {
  slippagePct: number;
  deadlineMins: number;
}

export interface LiquidityQuoteParams {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  decA: number;
  decB: number;
}

export interface LiquidityExecutionParams {
  tokenA: string;
  tokenB: string;
  amountA: string;
  amountB: string;
  slippagePct: number;
  deadlineMins: number;
  isAePair: boolean;
}

export interface RemoveLiquidityExecutionParams {
  tokenA: string;
  tokenB: string;
  liquidity: string; // LP tokens to remove
  slippagePct: number;
  deadlineMins: number;
  isAePair: boolean;
}
