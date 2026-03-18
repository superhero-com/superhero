import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { CONFIG } from '@/config';

// ─── Payload types (web equivalent of mobile's SignPayload) ─────────────────

export const TxPayloadType = {
  BuyToken: 'buy_token',
  SellToken: 'sell_token',
  ApproveAllowance: 'approve_allowance',
  CreateToken: 'create_token',
  CreatePost: 'create_post',
  CreateComment: 'create_comment',
  SwapToken: 'swap_token',
  WrapToken: 'wrap_ae',
  UnwrapToken: 'unwrap_wae',
  AddLiquidity: 'add_liquidity',
  RemoveLiquidity: 'remove_liquidity',
} as const;

export type TxPayload =
  | { type: typeof TxPayloadType.BuyToken; tokenName: string; tokenSymbol: string; coinAmount: string; estimatedTokens: string; saleAddress?: string }
  | { type: typeof TxPayloadType.SellToken; tokenName: string; tokenSymbol: string; tokenAmount: string; estimatedCoin: string; saleAddress?: string }
  | { type: typeof TxPayloadType.ApproveAllowance; tokenName: string; tokenSymbol: string; amount: string; stepNumber: number; totalSteps: number }
  | { type: typeof TxPayloadType.CreateToken; tokenName: string }
  | { type: typeof TxPayloadType.CreatePost; content: string }
  | { type: typeof TxPayloadType.CreateComment; postId: string }
  | { type: typeof TxPayloadType.SwapToken; tokenInSymbol: string; tokenOutSymbol: string; amountIn: string; amountOut: string }
  | { type: typeof TxPayloadType.WrapToken; amount: string }
  | { type: typeof TxPayloadType.UnwrapToken; amount: string }
  | { type: typeof TxPayloadType.AddLiquidity; tokenASymbol: string; tokenBSymbol: string; amountA: string; amountB: string; lpTokensEstimate?: string }
  | { type: typeof TxPayloadType.RemoveLiquidity; tokenASymbol: string; tokenBSymbol: string; liquidityPct: string; lpAmount: string };

// ─── Notification state machine ─────────────────────────────────────────────

export type NotificationState =
  | { status: 'idle' }
  | { status: 'submitted'; payload: TxPayload }
  | { status: 'pending'; payload: TxPayload; txHash: string }
  | { status: 'confirmed'; payload: TxPayload }
  | { status: 'error'; message: string };

type TransactionNotificationContextValue = {
  notificationState: NotificationState;
  notifySubmitted: (payload: TxPayload) => void;
  notifyPendingTx: (payload: TxPayload, txHash: string) => void;
  notifyConfirmed: (payload: TxPayload) => void;
  notifyError: (message: string) => void;
  dismissNotification: () => void;
};

const TransactionNotificationContext = createContext<
  TransactionNotificationContextValue | null>(null);

const AUTO_DISMISS_MS = 6_000;
const ERROR_DISMISS_MS = 5_000;
const POLL_INTERVAL_MS = 5_000;

/**
 * Poll the node until the transaction is mined (block_height !== -1).
 * Same logic as TokenSaleDetails.
 * */
async function checkTxMined(txHash: string): Promise<boolean> {
  try {
    const res = await fetch(
      `${CONFIG.NODE_URL}/v3/transactions/${txHash}?int-as-string=false`,
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data.block_height !== undefined && data.block_height !== -1;
  } catch {
    return false;
  }
}

export const TransactionNotificationProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [notificationState, setNotificationState] = useState<NotificationState>({ status: 'idle' });
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearDismissTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const clearPollInterval = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
  };

  useEffect(() => () => { clearPollInterval(); clearDismissTimer(); }, []);

  const dismissNotification = useCallback(() => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'idle' });
  }, []);

  const scheduleAutoDismiss = (payload: TxPayload, ms: number) => {
    clearDismissTimer();
    if (payload.type === TxPayloadType.CreateToken) return;
    dismissTimer.current = setTimeout(() => {
      setNotificationState({ status: 'idle' });
    }, ms);
  };

  const notifySubmitted = useCallback((payload: TxPayload) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'submitted', payload });
  }, []);

  const notifyConfirmed = useCallback((payload: TxPayload) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'confirmed', payload });
    scheduleAutoDismiss(payload, AUTO_DISMISS_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyPendingTx = useCallback(
    (payload: TxPayload, txHash: string) => {
      clearDismissTimer();
      clearPollInterval();
      setNotificationState({ status: 'pending', payload, txHash });

      const tryConfirm = async () => {
        const mined = await checkTxMined(txHash);
        if (mined) {
          clearPollInterval();
          setNotificationState({ status: 'confirmed', payload });
          scheduleAutoDismiss(payload, AUTO_DISMISS_MS);
        }
      };

      tryConfirm();
      pollInterval.current = setInterval(tryConfirm, POLL_INTERVAL_MS);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const notifyError = useCallback((message: string) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'error', message });
    dismissTimer.current = setTimeout(() => {
      setNotificationState({ status: 'idle' });
    }, ERROR_DISMISS_MS);
  }, []);

  const contextValue = useMemo(() => ({
    notificationState,
    notifySubmitted,
    notifyPendingTx,
    notifyConfirmed,
    notifyError,
    dismissNotification,
  }), [
    notificationState,
    notifySubmitted,
    notifyPendingTx,
    notifyConfirmed,
    notifyError,
    dismissNotification,
  ]);

  return (
    <TransactionNotificationContext.Provider value={contextValue}>
      {children}
    </TransactionNotificationContext.Provider>
  );
};

export function useTransactionNotification() {
  const ctx = useContext(TransactionNotificationContext);
  if (!ctx) {
    throw new Error('useTransactionNotification must be used within TransactionNotificationProvider');
  }
  return ctx;
}
