import { activeAccountAtom } from '@/atoms/accountAtoms';
import Spinner from '@/components/Spinner';
import { Decimal } from '@/libs/decimal';
import { useAtomValue } from 'jotai';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import SuperheroIcon from '@/svg/favicon.svg?react';
import { IconDiamond } from '@/icons';
import type { TxPayload } from './transaction-notification.context';
import { TxPayloadType, useTransactionNotification } from './transaction-notification.context';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(amount: string): string {
  return Decimal.from(amount).prettify();
}

function formatChangedFields(
  fields: Array<'bio' | 'website' | 'chain_name'>,
  t: TFunction,
): string {
  const labels: Record<'bio' | 'website' | 'chain_name', string> = {
    bio: t('common.transactionNotification.fieldBio'),
    website: t('common.transactionNotification.fieldWebsite'),
    chain_name: t('common.transactionNotification.fieldChainName'),
  };
  const parts = fields.map((field) => labels[field]);
  if (!parts.length) return t('common.transactionNotification.fieldProfile');
  if (parts.length === 1) return parts[0];
  // Comma list with a final ampersand: "bio, website & chain name".
  return `${parts.slice(0, -1).join(', ')} & ${parts[parts.length - 1]}`;
}

// Toasts backed by a central icon other than the Superhero mark (e.g. the blue diamond
// used for Superhero ID / profile updates).
function getIconVariant(payload: TxPayload): 'superhero' | 'diamond' {
  return payload.type === TxPayloadType.UpdateProfile ? 'diamond' : 'superhero';
}

// User must sign in their wallet — the app is waiting for that action.
function getSubmittedMeta(payload: TxPayload, t: TFunction): { title: string; subtitle: string } {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
    case TxPayloadType.SellToken:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.signTransactionToContinue'),
      };
    case TxPayloadType.ApproveAllowance:
      return {
        title: t('common.transactionNotification.approveTokenSpending'),
        subtitle: t('common.transactionNotification.approveAllowanceStep', {
          step: payload.stepNumber,
          total: payload.totalSteps,
          token: payload.tokenSymbol,
        }),
      };
    case TxPayloadType.CreateToken:
      return {
        title: t('common.transactionNotification.creatingToken', { name: payload.tokenName }),
        subtitle: t('common.transactionNotification.signInWalletToContinue'),
      };
    case TxPayloadType.CreatePost:
      return {
        title: t('common.transactionNotification.publishingPost'),
        subtitle: t('common.transactionNotification.signInWalletToContinue'),
      };
    case TxPayloadType.CreateComment:
      return {
        title: t('common.transactionNotification.publishingReply'),
        subtitle: t('common.transactionNotification.signInWalletToContinue'),
      };
    case TxPayloadType.ClaimChainName:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.signClaimRequest', { name: payload.name }),
      };
    case TxPayloadType.SwapToken:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.swappingTokens', {
          amountIn: fmt(payload.amountIn),
          tokenIn: payload.tokenInSymbol,
          amountOut: fmt(payload.amountOut),
          tokenOut: payload.tokenOutSymbol,
        }),
      };
    case TxPayloadType.WrapToken:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.wrappingAmount', { amount: fmt(payload.amount) }),
      };
    case TxPayloadType.UnwrapToken:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.unwrappingAmount', { amount: fmt(payload.amount) }),
      };
    case TxPayloadType.AddLiquidity:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.addingLiquidityAmounts', {
          amountA: fmt(payload.amountA),
          tokenA: payload.tokenASymbol,
          amountB: fmt(payload.amountB),
          tokenB: payload.tokenBSymbol,
        }),
      };
    case TxPayloadType.RemoveLiquidity:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.removingLiquidityFromPool', {
          pct: payload.liquidityPct,
          tokenA: payload.tokenASymbol,
          tokenB: payload.tokenBSymbol,
        }),
      };
    case TxPayloadType.UpdateProfile:
      return {
        title: t('common.transactionNotification.confirmInWallet'),
        subtitle: t('common.transactionNotification.signToUpdateFields', {
          fields: formatChangedFields(payload.fields, t),
        }),
      };
    default:
      throw new Error(`Unhandled TxPayloadType in getSubmittedMeta: ${(payload as TxPayload).type}`);
  }
}

// Tx is broadcast; we're waiting for the blockchain to confirm.
function getPendingMeta(payload: TxPayload, t: TFunction): { title: string; subtitle: string } {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
    case TxPayloadType.SellToken:
      return {
        title: t('common.transactionNotification.confirmingOnBlockchain'),
        subtitle: t('common.transactionNotification.usuallyTakesFewSeconds'),
      };
    case TxPayloadType.ApproveAllowance:
      return {
        title: t('common.transactionNotification.approvingToken', { token: payload.tokenSymbol }),
        subtitle: t('common.transactionNotification.confirmingAllowanceOnChain'),
      };
    case TxPayloadType.CreateToken:
      return {
        title: t('common.transactionNotification.creatingToken', { name: payload.tokenName }),
        subtitle: t('common.transactionNotification.confirmingOnBlockchainEllipsis'),
      };
    case TxPayloadType.CreatePost:
      return {
        title: t('common.transactionNotification.publishingPost'),
        subtitle: t('common.transactionNotification.confirmingOnBlockchainEllipsis'),
      };
    case TxPayloadType.CreateComment:
      return {
        title: t('common.transactionNotification.publishingReply'),
        subtitle: t('common.transactionNotification.confirmingOnBlockchainEllipsis'),
      };
    case TxPayloadType.ClaimChainName: {
      const title = t('common.transactionNotification.claimingName', { name: payload.name });
      switch (payload.step) {
        case 'preclaim':
          return { title, subtitle: t('common.transactionNotification.claimStepPreclaim') };
        case 'claim':
          return { title, subtitle: t('common.transactionNotification.claimStepClaim') };
        case 'update':
          return { title, subtitle: t('common.transactionNotification.claimStepUpdate') };
        case 'transfer':
          return { title, subtitle: t('common.transactionNotification.claimStepTransfer') };
        case 'queued':
          return { title, subtitle: t('common.transactionNotification.claimQueued') };
        default:
          return { title, subtitle: t('common.transactionNotification.claimProcessingBackground') };
      }
    }
    case TxPayloadType.SwapToken:
      return {
        title: t('common.transactionNotification.swapInProgress'),
        subtitle: t('common.transactionNotification.usuallyConfirmsFewSeconds'),
      };
    case TxPayloadType.WrapToken:
      return {
        title: t('common.transactionNotification.wrappingAeToWae'),
        subtitle: t('common.transactionNotification.confirmingOnChainEllipsis'),
      };
    case TxPayloadType.UnwrapToken:
      return {
        title: t('common.transactionNotification.unwrappingWaeToAe'),
        subtitle: t('common.transactionNotification.confirmingOnChainEllipsis'),
      };
    case TxPayloadType.AddLiquidity:
      return {
        title: t('common.transactionNotification.addingLiquidityEllipsis'),
        subtitle: t('common.transactionNotification.depositingIntoPool', {
          tokenA: payload.tokenASymbol,
          tokenB: payload.tokenBSymbol,
        }),
      };
    case TxPayloadType.RemoveLiquidity:
      return {
        title: t('common.transactionNotification.removingLiquidityEllipsis'),
        subtitle: t('common.transactionNotification.withdrawingFromPool', {
          tokenA: payload.tokenASymbol,
          tokenB: payload.tokenBSymbol,
        }),
      };
    case TxPayloadType.UpdateProfile:
      return {
        title: t('common.transactionNotification.updatingProfileEllipsis'),
        subtitle: t('common.transactionNotification.savingYourFields', {
          fields: formatChangedFields(payload.fields, t),
        }),
      };
    default:
      throw new Error(`Unhandled TxPayloadType in getPendingMeta: ${(payload as TxPayload).type}`);
  }
}

function getConfirmedMeta(payload: TxPayload, t: TFunction): {
  title: string;
  line: { leftLabel: string; leftColor: string; rightLabel?: string; rightColor?: string } | null;
} {
  switch (payload.type) {
    case TxPayloadType.BuyToken:
      return {
        title: t('common.transactionNotification.transactionConfirmed'),
        line: {
          leftLabel: `-${fmt(payload.coinAmount)} AE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.estimatedTokens)} ${payload.tokenSymbol}`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.SellToken:
      return {
        title: t('common.transactionNotification.transactionConfirmed'),
        line: {
          leftLabel: `-${fmt(payload.tokenAmount)} ${payload.tokenSymbol}`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.estimatedCoin)} AE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.ApproveAllowance:
      return {
        title: t('common.transactionNotification.allowanceApproved'),
        line: {
          leftLabel: t('common.transactionNotification.tokenApproved', { token: payload.tokenSymbol }),
          leftColor: '#4ade80',
        },
      };
    case TxPayloadType.SwapToken:
      return {
        title: t('common.transactionNotification.swapConfirmed'),
        line: {
          leftLabel: `-${fmt(payload.amountIn)} ${payload.tokenInSymbol}`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amountOut)} ${payload.tokenOutSymbol}`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.WrapToken:
      return {
        title: t('common.transactionNotification.wrapComplete'),
        line: {
          leftLabel: `-${fmt(payload.amount)} AE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amount)} WAE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.UnwrapToken:
      return {
        title: t('common.transactionNotification.unwrapComplete'),
        line: {
          leftLabel: `-${fmt(payload.amount)} WAE`,
          leftColor: '#f87171',
          rightLabel: `+${fmt(payload.amount)} AE`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.CreateToken:
      return {
        title: t('common.transactionNotification.tokenCreated'),
        line: { leftLabel: `#${payload.tokenName}`, leftColor: '#4ade80' },
      };
    case TxPayloadType.CreatePost:
      return { title: t('common.transactionNotification.postPublished'), line: null };
    case TxPayloadType.CreateComment:
      return { title: t('common.transactionNotification.replyPublished'), line: null };
    case TxPayloadType.ClaimChainName:
      return {
        title: t('common.transactionNotification.nameClaimed'),
        line: { leftLabel: `${payload.name}.chain`, leftColor: '#4ade80' },
      };
    case TxPayloadType.AddLiquidity:
      return {
        title: t('common.transactionNotification.liquidityAdded'),
        line: {
          leftLabel: `+${fmt(payload.amountA)} ${payload.tokenASymbol}`,
          leftColor: '#4ade80',
          rightLabel: `+${fmt(payload.amountB)} ${payload.tokenBSymbol}`,
          rightColor: '#4ade80',
        },
      };
    case TxPayloadType.RemoveLiquidity:
      return {
        title: t('common.transactionNotification.liquidityRemoved'),
        line: {
          leftLabel: `-${payload.liquidityPct}% LP`,
          leftColor: '#f87171',
          rightLabel: `${payload.tokenASymbol}/${payload.tokenBSymbol}`,
          rightColor: '#9ca3af',
        },
      };
    case TxPayloadType.UpdateProfile:
      return {
        title: t('common.transactionNotification.profileUpdated'),
        line: {
          leftLabel: t('common.transactionNotification.fieldsSaved', {
            fields: formatChangedFields(payload.fields, t),
          }),
          leftColor: '#4ade80',
        },
      };
    default:
      throw new Error(`Unhandled TxPayloadType in getConfirmedMeta: ${(payload as TxPayload).type}`);
  }
}

// ─── Notification content by type ────────────────────────────────────────────

// eslint-disable-next-line max-len
const cardBase = 'backdrop-blur-xl rounded-2xl px-3.5 py-3 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/[0.06]';

// Declared first — referenced by the components below.
const NotificationIcon = ({
  variant,
  icon = 'superhero',
}: { variant: 'error' | 'loading' | 'success'; icon?: 'superhero' | 'diamond' }) => {
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
      <div className={icon === 'diamond' ? 'w-[38px] h-[38px] flex items-center justify-center' : undefined}>
        {icon === 'diamond' ? (
          <IconDiamond className="w-[26px] h-[26px] text-[var(--neon-teal)]" />
        ) : (
          <SuperheroIcon className="w-[38px] h-[38px]" />
        )}
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

const NotificationError = ({ message }: { message: string }) => {
  const { t } = useTranslation();
  return (
    <div className={`${cardBase} bg-red-950/90`}>
      <NotificationIcon variant="error" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-red-400 font-bold text-sm leading-[18px] m-0">{t('common.messages.transactionFailed')}</p>
        <p className="text-gray-400 text-[13px] leading-[17px] m-0 truncate">{message}</p>
      </div>
      <div className="w-7 h-7 rounded-full bg-red-400/15 flex items-center justify-center flex-shrink-0">
        <span className="text-red-400 text-sm font-bold">✕</span>
      </div>
    </div>
  );
};

const NotificationWaiting = ({
  payload,
  kind,
}: {
  payload: TxPayload;
  kind: 'submitted' | 'pending';
}) => {
  const { t } = useTranslation();
  const { title, subtitle } = kind === 'submitted'
    ? getSubmittedMeta(payload, t)
    : getPendingMeta(payload, t);
  return (
    <div className={`${cardBase} bg-[#1a1a1a]/95`}>
      <NotificationIcon variant="loading" icon={getIconVariant(payload)} />
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
  const { t } = useTranslation();
  const meta = getConfirmedMeta(payload, t);
  const portfolioHref = activeAccount
    ? `/users/${encodeURIComponent(activeAccount)}`
    : undefined;

  return (
    <div className={`${cardBase} bg-[#1a1a1a]/95`}>
      <NotificationIcon variant="success" icon={getIconVariant(payload)} />
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
          <span className="text-[#0a0a0a] font-bold text-[13px]">{t('common.buttons.viewPortfolio')}</span>
        </button>
      ) : (
        <div className="bg-green-400 rounded-full px-4 py-2 flex-shrink-0">
          <span className="text-[#0a0a0a] font-bold text-[13px]">{t('common.buttons.done')}</span>
        </div>
      )}
    </div>
  );
};

// ─── Main banner ─────────────────────────────────────────────────────────────

export const TransactionNotificationBanner = () => {
  const { t } = useTranslation();
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
      aria-label={t('common.aria.dismissNotification')}
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
