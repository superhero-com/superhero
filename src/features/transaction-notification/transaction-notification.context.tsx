import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { isTransactionMined } from '@/utils/apiRead';

// ─── Payload types (web equivalent of mobile's SignPayload) ─────────────────

export const TxPayloadType = {
  BuyToken: 'buy_token',
  SellToken: 'sell_token',
  ApproveAllowance: 'approve_allowance',
  CreateToken: 'create_token',
  CreatePost: 'create_post',
  CreateComment: 'create_comment',
  ClaimChainName: 'claim_chain_name',
  SwapToken: 'swap_token',
  WrapToken: 'wrap_ae',
  UnwrapToken: 'unwrap_wae',
  AddLiquidity: 'add_liquidity',
  RemoveLiquidity: 'remove_liquidity',
  UpdateProfile: 'update_profile',
  LinkX: 'link_x',
  UnlinkX: 'unlink_x',
} as const;

export type TxPayload =
  | { type: typeof TxPayloadType.BuyToken; tokenName: string; tokenSymbol: string; coinAmount: string; estimatedTokens: string; saleAddress?: string }
  | { type: typeof TxPayloadType.SellToken; tokenName: string; tokenSymbol: string; tokenAmount: string; estimatedCoin: string; saleAddress?: string }
  | { type: typeof TxPayloadType.ApproveAllowance; tokenName: string; tokenSymbol: string; amount: string; stepNumber: number; totalSteps: number }
  // `startedAt`: when the creation was broadcast, for the pending card; the
  // token is live once the backend has it, which can take minutes.
  | { type: typeof TxPayloadType.CreateToken; tokenName: string; startedAt?: number }
  | { type: typeof TxPayloadType.CreatePost; content: string }
  | { type: typeof TxPayloadType.CreateComment; postId: string }
  | { type: typeof TxPayloadType.ClaimChainName; name: string; step?: 'wallet' | 'queued' | 'preclaim' | 'claim' | 'update' | 'transfer' }
  | { type: typeof TxPayloadType.SwapToken; tokenInSymbol: string; tokenOutSymbol: string; amountIn: string; amountOut: string }
  | { type: typeof TxPayloadType.WrapToken; amount: string }
  | { type: typeof TxPayloadType.UnwrapToken; amount: string }
  | { type: typeof TxPayloadType.AddLiquidity; tokenASymbol: string; tokenBSymbol: string; amountA: string; amountB: string; lpTokensEstimate?: string }
  | { type: typeof TxPayloadType.RemoveLiquidity; tokenASymbol: string; tokenBSymbol: string; liquidityPct: string; lpAmount: string }
  | { type: typeof TxPayloadType.UpdateProfile; fields: Array<'bio' | 'website' | 'chain_name'> }
  // No handle carried: the claim's `value` may be the X user id rather than the
  // username, and "@1234567890" in a toast is worse than no handle at all.
  // `startedAt` is when the change was broadcast: the wait is minutes, not
  // seconds, so the pending banner shows how far along it is.
  | { type: typeof TxPayloadType.LinkX; startedAt?: number }
  | { type: typeof TxPayloadType.UnlinkX; startedAt?: number };

// ─── Notification state machine ─────────────────────────────────────────────

export type NotificationState =
  | { status: 'idle' }
  | { status: 'submitted'; payload: TxPayload }
  | { status: 'pending'; payload: TxPayload; txHash: string }
  | { status: 'confirmed'; payload: TxPayload }
  | { status: 'error'; message: string };

export type PendingTxOptions = {
  /**
   * Runs once, when the poll sees the transaction mined. The notification
   * provider is app-level, so this fires even after the caller's page has
   * unmounted — which is the point: a flow that navigates away while the chain
   * catches up can still refresh the data it changed. Not called if a newer
   * notification supersedes this one before it confirms.
   */
  onConfirmed?: () => void;
};

type TransactionNotificationContextValue = {
  notificationState: NotificationState;
  notifySubmitted: (payload: TxPayload) => void;
  notifyPending: (payload: TxPayload) => void;
  notifyPendingTx: (payload: TxPayload, txHash: string, options?: PendingTxOptions) => void;
  notifyConfirmed: (payload: TxPayload) => void;
  notifyError: (message: string) => void;
  dismissNotification: () => void;
};

const TransactionNotificationContext = createContext<
  TransactionNotificationContextValue | null>(null);

const AUTO_DISMISS_MS = 6_000;
const ERROR_DISMISS_MS = 5_000;
const POLL_INTERVAL_MS = 5_000;

export const TransactionNotificationProvider: React.FC<{
  children: React.ReactNode
}> = ({ children }) => {
  const [notificationState, setNotificationState] = useState<NotificationState>({ status: 'idle' });
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  // Incremented every time an active poll is cancelled. Each tryConfirm closure captures
  // the generation at creation and discards its result if the value has since changed,
  // preventing a stale in-flight fetch from overwriting newer notification state.
  const pollGeneration = useRef(0);

  const clearDismissTimer = () => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  };

  const clearPollInterval = () => {
    pollGeneration.current += 1;
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
    dismissTimer.current = setTimeout(() => {
      setNotificationState({ status: 'idle' });
    }, ms);
  };

  const notifySubmitted = useCallback((payload: TxPayload) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'submitted', payload });
  }, []);

  const notifyPending = useCallback((payload: TxPayload) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'pending', payload, txHash: '' });
  }, []);

  const notifyConfirmed = useCallback((payload: TxPayload) => {
    clearDismissTimer();
    clearPollInterval();
    setNotificationState({ status: 'confirmed', payload });
    scheduleAutoDismiss(payload, AUTO_DISMISS_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifyPendingTx = useCallback(
    (payload: TxPayload, txHash: string, options?: PendingTxOptions) => {
      clearDismissTimer();
      clearPollInterval();
      // Capture the generation after clearing so this poll cycle has a unique token.
      const gen = pollGeneration.current;
      setNotificationState({ status: 'pending', payload, txHash });

      const tryConfirm = async () => {
        const mined = await isTransactionMined(txHash);
        // Discard the result if a newer notification superseded this poll cycle.
        if (gen !== pollGeneration.current) return;
        if (mined) {
          clearPollInterval();
          setNotificationState({ status: 'confirmed', payload });
          scheduleAutoDismiss(payload, AUTO_DISMISS_MS);
          // After clearPollInterval, so a slow callback can't overlap a re-poll,
          // and isolated so a throwing callback can't strand the banner.
          try {
            options?.onConfirmed?.();
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[tx-notification] onConfirmed callback failed', err);
          }
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
    notifyPending,
    notifyPendingTx,
    notifyConfirmed,
    notifyError,
    dismissNotification,
  }), [
    notificationState,
    notifySubmitted,
    notifyPending,
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
