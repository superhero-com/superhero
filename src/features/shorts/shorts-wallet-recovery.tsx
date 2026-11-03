import { useEffect, useRef } from 'react';
import {
  useTransactionNotification, TxPayloadType, type NotificationState,
} from '@/features/transaction-notification';
import type { useShortsWalletTransactions } from './use-shorts-wallet-transactions';

const ownsNotification = (state: NotificationState, id: string) => (
  state.status !== 'idle' && state.payload?.type === TxPayloadType.ShortsAction && state.payload.id === id
);
const walletCopy = {
  like: ['Your Like', 'Like confirmed'],
  paid_like: ['Your Like', 'Like confirmed'],
  add_comment: ['Your comment', 'Comment published'],
  delete_comment: ['Your comment deletion', 'Comment deleted'],
  claim: ['Your reward claim', 'Rewards claimed to your wallet'],
  withdraw: ['Your withdrawal', 'Short withdrawn from official playback'],
};

export const ShortsWalletRecovery = ({
  recovery, message = '', messageTone = 'info', scope = '',
}: {
  recovery: ReturnType<typeof useShortsWalletTransactions>;
  message?: string;
  messageTone?: 'info' | 'success' | 'error';
  scope?: string;
}) => {
  const {
    notificationState, notifySubmitted, notifyPending, notifyConfirmed, notifyError, dismissNotification,
  } = useTransactionNotification();
  const currentNotification = useRef(notificationState);
  currentNotification.current = notificationState;
  const announced = useRef({ wallet: '', message: '' });
  const owned = useRef<{ id: string; source: 'wallet' | 'message' } | undefined>(undefined);
  const { action, observation, error } = recovery;
  const [label, confirmedTitle] = action ? walletCopy[action.method] : ['Your action', 'Action complete'];
  const walletId = action && JSON.stringify(['shorts-wallet', action.api, action.network, action.address, action.contract, action.id]);
  const id = walletId || (error ? JSON.stringify(['shorts-wallet-error', scope, error]) : undefined);
  const walletScope = scope || JSON.stringify([action?.api, action?.network, action?.address, action?.contract]);
  let failure = error;
  if (!failure && observation?.neverSubmitted) failure = `${label} was not sent. Please try again.`;
  else if (!failure && observation?.sponsorshipExpired) failure = `${label} expired without confirmation. Please try again.`;
  else if (!failure && observation?.status === 'failed') failure = `${label} could not be completed. Please try again.`;
  let status: 'submitted' | 'pending' | 'confirmed' | 'error' = 'pending';
  if (failure) status = 'error';
  else if (!action?.tx) status = 'submitted';
  else if (observation?.status === 'confirmed') status = 'confirmed';
  const walletKey = id ? JSON.stringify([id, status, failure]) : '';
  const messageKey = message ? JSON.stringify(['shorts-action', walletScope, message, messageTone]) : '';

  useEffect(() => () => {
    if (owned.current && ownsNotification(currentNotification.current, owned.current.id)) dismissNotification();
    announced.current = { wallet: '', message: '' };
    owned.current = undefined;
  }, [walletScope, dismissNotification]);

  useEffect(() => {
    const messageChanged = messageKey !== announced.current.message;
    const walletChanged = walletKey !== announced.current.wallet;
    const source = messageChanged && messageKey ? 'message' : 'wallet';
    const nextId = source === 'message' ? messageKey : id;
    if (!(messageChanged && messageKey) && !(walletChanged && walletKey)) {
      announced.current = { message: messageKey, wallet: walletKey };
      // Clearing a message/action removes only feedback that it still owns.
      if (owned.current && !(owned.current.source === 'message' ? messageKey : walletKey)
        && ownsNotification(notificationState, owned.current.id)) dismissNotification();
      return;
    }
    // Leave a newer unrelated app notification alone. Dismissal does not replay
    // an unchanged outcome, and new wallet outcomes can replace old Studio copy.
    if (notificationState.status !== 'idle' && (!owned.current || !ownsNotification(notificationState, owned.current.id))) return;
    announced.current = { message: messageKey, wallet: walletKey };
    owned.current = { id: nextId!, source };
    const isMessage = source === 'message';
    const nextStatus = isMessage ? { info: 'pending', success: 'confirmed', error: 'error' }[messageTone] : status;
    const payload = {
      type: TxPayloadType.ShortsAction,
      id: nextId!,
      wallet: !isMessage,
      pendingTitle: isMessage ? message : 'Confirming on blockchain',
      pendingMessage: isMessage ? 'Please wait…' : `${label} is being confirmed.`,
      confirmedTitle: isMessage ? message : confirmedTitle,
    } as const;
    if (nextStatus === 'submitted') notifySubmitted(payload);
    else if (nextStatus === 'confirmed') notifyConfirmed(payload);
    else if (nextStatus === 'error') notifyError(isMessage ? message : failure!, payload);
    else notifyPending(payload);
  }, [id, walletKey, messageKey, status, failure, message, messageTone, label, confirmedTitle, notificationState, notifySubmitted, notifyPending, notifyConfirmed, notifyError, dismissNotification]);

  return null;
};
