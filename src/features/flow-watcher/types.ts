export type FlowType =
  | 'buy_ae'
  | 'ae_eth_bridge'
  | 'dex_swap'
  | 'dex_add_liquidity'
  | 'dex_remove_liquidity'
  | 'custom';

export type FlowStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'stale';

export type FlowStepKind =
  | 'wallet_confirmation'
  | 'tx_confirm'
  | 'balance_condition'
  | 'manual_action';

export type FlowStepStatus =
  | 'pending'
  | 'awaiting_user'
  | 'submitted'
  | 'monitoring'
  | 'confirmed'
  | 'failed'
  | 'skipped';

export interface ConfirmationPreview {
  title: string;
  network: string;
  action: string;
  asset?: string;
  amount?: string;
  spenderOrContract?: string;
  estimatedFeeNote?: string;
  riskHint?: string;
}

export interface TxConfirmCondition {
  txHash: string;
  chain: 'ae' | 'evm';
}

export interface BalanceCondition {
  tokenAddress: string;
  account: string;
  previousBalance: string;
  expectedIncrease: string;
  toleranceBps?: number;
}

export interface FlowStep {
  id: string;
  label: string;
  kind: FlowStepKind;
  status: FlowStepStatus;
  timeoutMs?: number;
  startedAt?: number;
  updatedAt?: number;
  preview?: ConfirmationPreview;
  txConfirm?: TxConfirmCondition;
  balanceCondition?: BalanceCondition;
  error?: string;
}

export interface FlowRecord {
  id: string;
  flowType: FlowType;
  status: FlowStatus;
  currentStepIndex: number;
  steps: FlowStep[];
  context?: Record<string, unknown>;
  txHashes?: string[];
  lastError?: string;
  createdAt: number;
  updatedAt: number;
}

export type FlowRecordMap = Record<string, FlowRecord>;

export interface StartFlowInput {
  flowType: FlowType;
  steps: FlowStep[];
  context?: Record<string, unknown>;
}
