import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import {
  TX_QUEUE_ACK_CHANNEL,
  TX_QUEUE_RESULT_PREFIX,
  transactionsQueueAtom,
} from '../atoms/txQueueAtoms';

const RELAY_ACK_TIMEOUT_MS = 1500;

const getSafeReturnPath = (returnUrl: unknown) => {
  if (typeof returnUrl !== 'string' || !returnUrl.trim()) return '/';

  try {
    const url = new URL(returnUrl, window.location.origin);
    if (url.origin !== window.location.origin) return '/';
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return '/';
  }
};

const normalizeSignedTx = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().replace(/\s/g, '+');
  if (!trimmed || trimmed === '{transaction}' || trimmed === 'undefined' || trimmed === 'null') {
    return undefined;
  }
  return trimmed.startsWith('tx_') ? trimmed : undefined;
};

const TxQueue = () => {
  const { t } = useTranslation('transactions');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [, setTransactionsQueue] = useAtom(transactionsQueueAtom);

  const query = useMemo(
    () => Object.fromEntries(new URLSearchParams(location.search).entries()),
    [location.search],
  );

  const signedTx = useMemo(() => normalizeSignedTx(
    (query as any).transaction
    ?? (query as any).signedTransaction
    ?? (query as any).signed_tx
    ?? (query as any).tx,
  ), [query]);

  const status = useMemo(
    () => String((query as any).status || '').toLowerCase(),
    [query],
  );

  useEffect(() => {
    let timer: number | undefined;
    let ackChannel: BroadcastChannel | null = null;
    let acked = false;

    if (id) {
      const leaveQueue = (targetPath = getSafeReturnPath((query as any).returnUrl)) => {
        window.close();
        if (!window.closed) {
          navigate(targetPath, { replace: true });
        }
      };

      if (typeof BroadcastChannel !== 'undefined') {
        ackChannel = new BroadcastChannel(TX_QUEUE_ACK_CHANNEL);
        ackChannel.onmessage = (event) => {
          if (event.data?.id !== id) return;
          acked = true;
          if (timer) window.clearTimeout(timer);
          leaveQueue();
        };
      }

      // Update the transactions queue
      setTransactionsQueue((prevQueue) => ({
        ...prevQueue,
        [id]: {
          ...prevQueue[id], // Keep existing data
          ...query, // Merge in new query data
          ...(signedTx ? { transaction: signedTx } : {}),
          ...(status === 'completed' && !signedTx ? { status: 'cancelled' } : {}),
        } as any, // Using any here because query can contain various properties
      }));
      localStorage.setItem(
        `${TX_QUEUE_RESULT_PREFIX}${id}`,
        JSON.stringify({
          ...query,
          ...(signedTx ? { transaction: signedTx } : {}),
          ...(status === 'completed' && !signedTx ? { status: 'cancelled' } : {}),
        }),
      );

      // Android Chrome may open the callback in a temporary tab while the original
      // app tab is still alive. Give that tab a moment to acknowledge the relay
      // before closing or navigating away.
      timer = window.setTimeout(() => {
        if (!acked) leaveQueue();
      }, RELAY_ACK_TIMEOUT_MS);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
      ackChannel?.close();
    };
  }, [
    id,
    navigate,
    query,
    signedTx,
    status,
    setTransactionsQueue,
  ]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">
        {t('processingTransaction')}
      </div>
    </div>
  );
};

export default TxQueue;
