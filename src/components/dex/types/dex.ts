import { DexTokenDto } from "../../../api/generated";

export interface TokenBalance {
  in?: string;
  out?: string;
}

export interface WrapBalances {
  ae?: string;
  wae?: string;
}

export interface SwapState {
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  amountIn: string;
  amountOut: string;
  isExactIn: boolean;
  loading: boolean;
  error: string | null;
  quoteLoading: boolean;
  path: string[];
  routesFromBackend: any[][] | null;
  priceImpactPct: number | null;
  allowanceInfo: string | null;
  balances: TokenBalance;
  searchIn: string;
  searchOut: string;
}

export interface EthxitState {
  ethxitIn: string;
  ethxitOut: string;
  ethxitQuoting: boolean;
  ethxitSwapping: boolean;
  ethxitError: string | null;
}

export interface EthBridgeState {
  ethBridgeIn: string;
  ethBridgeOutAe: string;
  ethBridgeQuoting: boolean;
  ethBridgeProcessing: boolean;
  ethBridgeError: string | null;
  ethBridgeStep: 'idle' | 'bridging' | 'waiting' | 'swapping' | 'done';
}

export interface WrapState {
  wrapAmount: string;
  wrapBalances: WrapBalances;
  wrapping: boolean;
}

export interface TransactionStatus {
  confirmed: boolean;
  blockNumber?: number;
  confirmations?: number;
  pending?: boolean;
  failed?: boolean;
}

export interface RecentActivity {
  type: 'swap' | 'wrap' | 'unwrap' | 'bridge' | 'add_liquidity' | 'remove_liquidity';
  hash?: string;
  timestamp: number;
  tokenIn?: string;
  tokenOut?: string;
  amountIn?: string;
  amountOut?: string;
  pairAddress?: string; // For liquidity operations
  account: string; // User account address
  status?: TransactionStatus; // Transaction confirmation status
}

export interface SwapQuoteParams {
  amountIn: string;
  amountOut: string;
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  isExactIn: boolean;
}

export interface SwapExecutionParams {
  amountIn: string;
  amountOut: string;
  tokenIn: DexTokenDto | null;
  tokenOut: DexTokenDto | null;
  path: string[];
  slippagePct: number;
  deadlineMins: number;
  isExactIn: boolean;
}

export interface TokenListState {
  tokens: DexTokenDto[];
  loading: boolean;
}

export interface SwapSettings {
  slippagePct: number;
  deadlineMins: number;
}

export interface RouteInfo {
  path: string[];
  reserves?: Array<{
    token0: string;
    token1: string;
    reserve0: string;
    reserve1: string;
  }>;
  priceImpact?: number;
}
