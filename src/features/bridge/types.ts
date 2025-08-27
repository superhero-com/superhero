/**
 * Bridge operation status
 */
export type BridgeStatus = 
  | 'idle'
  | 'connecting'
  | 'bridging'
  | 'waiting'
  | 'swapping'
  | 'completed'
  | 'failed';

/**
 * Bridge operation result
 */
export interface BridgeResult {
  success: boolean;
  ethTxHash?: string;
  aeTxHash?: string;
  error?: string;
  status: BridgeStatus;
}

/**
 * Bridge operation options
 */
export interface BridgeOptions {
  /** Amount of ETH to bridge */
  amountEth: string;
  /** æternity account address to receive æETH */
  aeAccount: string;
  /** Timeout for waiting for æETH deposit (ms) */
  depositTimeout?: number;
  /** Polling interval for checking æETH balance (ms) */
  pollInterval?: number;
  /** Whether to automatically swap æETH to AE after bridging */
  autoSwap?: boolean;
  /** Slippage percentage for swap (if autoSwap is true) */
  slippagePercent?: number;
  /** Deadline minutes for swap (if autoSwap is true) */
  deadlineMinutes?: number;
}

/**
 * Bridge progress callback
 */
export type BridgeProgressCallback = (status: BridgeStatus, message?: string) => void;

/**
 * Bridge error types
 */
export enum BridgeErrorType {
  WALLET_NOT_CONNECTED = 'WALLET_NOT_CONNECTED',
  WRONG_NETWORK = 'WRONG_NETWORK',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  TRANSACTION_REJECTED = 'TRANSACTION_REJECTED',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  DEPOSIT_TIMEOUT = 'DEPOSIT_TIMEOUT',
  SWAP_FAILED = 'SWAP_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Bridge error class
 */
export class BridgeError extends Error {
  constructor(
    public type: BridgeErrorType,
    message: string,
    public originalError?: any
  ) {
    super(message);
    this.name = 'BridgeError';
  }
}
