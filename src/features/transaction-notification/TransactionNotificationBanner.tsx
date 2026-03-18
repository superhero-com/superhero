import { activeAccountAtom } from '@/atoms/accountAtoms';
import Spinner from '@/components/Spinner';
import { Decimal } from '@/libs/decimal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import SuperheroIcon from '@/svg/favicon.svg?react';
import type { TxPayload } from './transaction-notification.context';
import { TxPayloadType, useTransactionNotification } from './transaction-notification.context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: string): string {
  return Decimal.from(amount).prettify();
}

// User must sign in their wallet — the app is waiting for that action.
function getSubmittedMeta(payload: TxPayload): { title: string; subtitle: string } {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
    case TxPayloadType.SellToken:
      return { title: 'Confirm in your wallet', subtitle: 'Sign the transaction to continue' };
    case TxPayloadType.ApproveAllowance:
      return {
        title: 'Approve token spending',
        subtitle: `Step ${payload.stepNumber} of ${payload.totalSteps} — allow DEX to use your ${payload.tokenSymbol}`,
      };
    case TxPayloadType.CreateToken:
      return { title: `Creating #${payload.tokenName}`, subtitle: 'Sign in your wallet to continue' };
    case TxPayloadType.CreatePost:
      return { title: 'Publishing post', subtitle: 'Sign in your wallet to continue' };
    case TxPayloadType.CreateComment:
      return { title: 'Publishing reply', subtitle: 'Sign in your wallet to continue' };
    case TxPayloadType.SwapToken:
      return {
        title: 'Confirm in your wallet',
        subtitle: `Swapping ${fmt(payload.amountIn)} ${payload.tokenInSymbol} → ${fmt(payload.amountOut)} ${payload.tokenOutSymbol}`,
      };
    case TxPayloadType.WrapToken:
      return { title: 'Confirm in your wallet', subtitle: `Wrapping ${fmt(payload.amount)} AE → WAE` };
    case TxPayloadType.UnwrapToken:
      return { title: 'Confirm in your wallet', subtitle: `Unwrapping ${fmt(payload.amount)} WAE → AE` };
    default:
      throw new Error(`Unhandled TxPayloadType in getSubmittedMeta: ${(payload as TxPayload).type}`);
  }
}

// Tx is broadcast; we're waiting for the blockchain to confirm.
function getPendingMeta(payload: TxPayload): { title: string; subtitle: string } {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
    case TxPayloadType.SellToken:
      return { title: 'Confirming on blockchain', subtitle: 'Usually takes a few seconds' };
    case TxPayloadType.ApproveAllowance:
      return { title: `Approving ${payload.tokenSymbol}…`, subtitle: 'Confirming allowance on-chain' };
    case TxPayloadType.CreateToken:
      return { title: `Creating #${payload.tokenName}`, subtitle: 'Confirming on blockchain…' };
    case TxPayloadType.CreatePost:
      return { title: 'Publishing post', subtitle: 'Confirming on blockchain…' };
    case TxPayloadType.CreateComment:
      return { title: 'Publishing reply', subtitle: 'Confirming on blockchain…' };
    case TxPayloadType.SwapToken:
      return { title: 'Swap in progress', subtitle: 'Usually confirms in a few seconds' };
    case TxPayloadType.WrapToken:
      return { title: 'Wrapping AE → WAE', subtitle: 'Confirming on-chain…' };
    case TxPayloadType.UnwrapToken:
      return { title: 'Unwrapping WAE → AE', subtitle: 'Confirming on-chain…' };
    default:
      throw new Error(`Unhandled TxPayloadType in getPendingMeta: ${(payload as TxPayload).type}`);
  }
}

function getConfirmedMeta(payload: TxPayload): {
  title: string;
  line: { leftLabel: string; leftColor: string; rightLabel?: string; rightColor?: string } | null;
} {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
      return {
        title: 'Transaction confirmed',
        line: {
          leftLabel: `-${fmt(payload.coinAmount)} AE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.estimatedTokens)} ${payload.tokenSymbol}`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.SellToken:
      return {
        title: 'Transaction confirmed',
        line: {
          leftLabel: `-${fmt(payload.tokenAmount)} ${payload.tokenSymbol}`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.estimatedCoin)} AE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.ApproveAllowance:
      return { title: 'Allowance approved', line: { leftLabel: `${payload.tokenSymbol} approved`, leftColor: '#4ade80' } };
    case TxPayloadType.SwapToken:
      return {
        title: 'Swap confirmed',
        line: {
          leftLabel: `-${fmt(payload.amountIn)} ${payload.tokenInSymbol}`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amountOut)} ${payload.tokenOutSymbol}`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.WrapToken:
      return {
        title: 'Wrap complete',
        line: {
          leftLabel: `-${fmt(payload.amount)} AE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amount)} WAE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.UnwrapToken:
      return {
        title: 'Unwrap complete',
        line: {
          leftLabel: `-${fmt(payload.amount)} WAE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amount)} AE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.CreateToken:
      return {
        title: 'Token created',
        line: { leftLabel: `#${payload.tokenName}`, leftColor: '#4ade80' },
      };
    case TxPayloadType.CreatePost:
      return { title: 'Post published', line: null };
    case TxPayloadType.CreateComment:
      return { title: 'Reply published', line: null };
    default:
      throw new Error(`Unhandled TxPayloadType in getConfirmedMeta: ${(payload as TxPayload).type}`);
  }
}

// ─── Notification content by type ────────────────────────────────────────────

// eslint-disable-next-line max-len
const cardBase = 'backdrop-blur-xl rounded-2xl px-3.5 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/[0.06]';

// Declared first — referenced by the components below.
const NotificationIcon = ({ variant }: { variant: 'error' | 'loading' | 'success' }) => {
  const isError = variant === 'error';
  const isSuccess = variant === 'success';

  let badgeBg: string;
  if (isError) {
    badgeBg = 'bg-red-400';
  } else if (isSuccess) {
    badgeBg = 'bg-green-400';
  } else {
    badgeBg = 'bg-[#2a2a2a]';
  }

  const borderColor = isError ? 'border-red-950' : 'border-[#1a1a1a]';

  return (
    <div className="relative w-11 h-11 flex-shrink-0">
      <div>
        <SuperheroIcon className="w-[38px] h-[38px]" />
      </div>
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-[22px] h-[22px] rounded-full ${badgeBg} flex items-center justify-center border-2 ${borderColor}`}
      >
        {isError && <span className="text-[11px] text-white font-bold leading-none">✕</span>}
        {isSuccess && <span className="text-[11px] text-[#0a0a0a] font-bold leading-none">✓</span>}
        {!isError && !isSuccess && <Spinner className="w-2.5 h-2.5 text-gray-400" />}
      </div>
    </div>
  );
};

const NotificationError = ({ message }: { message: string }) => (
  <div className={`${cardBase} bg-red-950/90`}>
    <NotificationIcon variant="error" />
    <div className="flex-1 min-w-0 space-y-0.5">
      <p className="text-red-400 font-bold text-sm leading-[18px] m-0">Transaction failed</p>
      <p className="text-gray-400 text-[13px] leading-[17px] m-0 truncate">{message}</p>
    </div>
    <div className="w-7 h-7 rounded-full bg-red-400/15 flex items-center justify-center flex-shrink-0">
      <span className="text-red-400 text-sm font-bold">✕</span>
    </div>
  </div>
);

const NotificationWaiting = ({
  payload,
  kind,
}: {
  payload: TxPayload;
  kind: 'submitted' | 'pending';
}) => {
  const { title, subtitle } = kind === 'submitted'
    ? getSubmittedMeta(payload)
    : getPendingMeta(payload);
  return (
    <div className={`${cardBase} bg-[#1a1a1a]/95`}>
      <NotificationIcon variant="loading" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-white font-bold text-sm leading-[18px] m-0">{title}</p>
        <p className="text-gray-400 text-[13px] leading-[17px] m-0">{subtitle}</p>
      </div>
      <div className="w-7" />
    </div>
  );
};

const NotificationConfirmed = ({
  payload,
  activeAccount,
}: {
  payload: TxPayload;
  activeAccount: string | undefined;
}) => {
  const meta = getConfirmedMeta(payload);
  const portfolioHref = activeAccount
    ? `/users/${encodeURIComponent(activeAccount)}`
    : undefined;

  return (
    <div className={`${cardBase} bg-[#1a1a1a]/95`}>
      <NotificationIcon variant="success" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-white font-bold text-sm leading-[18px] m-0">{meta.title}</p>
        {meta.line && (
          <p className="text-[13px] leading-[17px] m-0">
            <span style={{ color: meta.line.leftColor }}>{meta.line.leftLabel}</span>
            {meta.line.rightLabel && (
              <>
                <span className="text-gray-600">{' '}</span>
                <span style={{ color: meta.line.rightColor }}>{meta.line.rightLabel}</span>
              </>
            )}
          </p>
        )}
      </div>
      {portfolioHref ? (
        <button
          type="button"
          className="bg-green-400 rounded-full px-4 py-2 flex-shrink-0 cursor-pointer border-0"
          onClick={(e) => {
            e.stopPropagation();
            window.location.href = portfolioHref;
          }}
        >
          <span className="text-[#0a0a0a] font-bold text-[13px]">View Portfolio</span>
        </button>
      ) : (
        <div className="bg-green-400 rounded-full px-4 py-2 flex-shrink-0">
          <span className="text-[#0a0a0a] font-bold text-[13px]">Done</span>
        </div>
      )}
    </div>
  );
};

// ─── Main banner ─────────────────────────────────────────────────────────────

export const TransactionNotificationBanner = () => {
  const { notificationState, dismissNotification } = useTransactionNotification();
  const activeAccount = useAtomValue(activeAccountAtom);
  const [visible, setVisible] = useState(false);
  const bannerRef = useRef<HTMLDivElement>(null);

  const isActive = notificationState.status !== 'idle';

  useEffect(() => {
    if (isActive) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isActive]);

  if (!isActive && !visible) return null;

  const content = (() => {
    switch (notificationState.status) {
      case 'error':
        return <NotificationError message={notificationState.message} />;
      case 'submitted':
        return <NotificationWaiting payload={notificationState.payload} kind="submitted" />;
      case 'pending':
        return <NotificationWaiting payload={notificationState.payload} kind="pending" />;
      case 'confirmed':
        return (
          <NotificationConfirmed
            payload={notificationState.payload}
            activeAccount={activeAccount}
          />
        );
      default:
        return null;
    }
  })();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') dismissNotification();
  };

  return (
    <div
      ref={bannerRef}
      role="button"
      tabIndex={0}
      aria-label="Dismiss notification"
      onClick={dismissNotification}
      onKeyDown={handleKeyDown}
      className={`
        fixed top-3 left-3 right-3 z-[9999] cursor-pointer
        transition-all duration-300 ease-out
        ${visible && isActive ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
      `}
      style={{ maxWidth: 480, margin: '0 auto' }}
    >
      {content}
    </div>
  );
};
