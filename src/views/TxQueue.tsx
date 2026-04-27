import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import { buildTxHash } from '@aeternity/aepp-sdk';
import { transactionsQueueAtom } from '../atoms/txQueueAtoms';
import { useAeSdk } from '../hooks/useAeSdk';
import { TxPayloadType, useTransactionNotification } from '../features/transaction-notification';

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

const getSuccessReturnPath = (query: Record<string, string>) => {
  if (query.successUrl) return getSafeReturnPath(query.successUrl);

  return getSafeReturnPath(query.returnUrl);
};

const isAlreadySubmittedError = (message: string) => (
  /already|known|exists|mempool|tx already/i.test(message)
);

const broadcastInFlight = new Map<string, Promise<void>>();

const TxQueue = () => {
  const { t } = useTranslation('transactions');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { sdkInitialized, staticAeSdk } = useAeSdk();
  const { notifyPendingTx } = useTransactionNotification();
  const [, setTransactionsQueue] = useAtom(transactionsQueueAtom);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(
    () => Object.fromEntries(new URLSearchParams(location.search).entries()),
    [location.search],
  );

  const signedTx = useMemo(() => {
    const normalizeSignedTx = (value: unknown): string | undefined => {
      if (typeof value !== 'string') return undefined;
      const trimmed = value.trim().replace(/\s/g, '+');
      if (!trimmed || trimmed === '{transaction}' || trimmed === 'undefined' || trimmed === 'null') {
        return undefined;
      }
      return trimmed.startsWith('tx_') ? trimmed : undefined;
    };

    return normalizeSignedTx(
      (query as any).transaction
      ?? (query as any).signedTransaction
      ?? (query as any).signed_tx
      ?? (query as any).tx,
    );
  }, [query]);

  const status = useMemo(
    () => String((query as any).status || '').toLowerCase(),
    [query],
  );

  useEffect(() => {
    if (!id) return;

    // Update the transactions queue for the original tab/popup flow.
    setTransactionsQueue((prevQueue) => ({
      ...prevQueue,
      [id]: {
        ...prevQueue[id], // Keep existing data
        ...query, // Merge in new query data
        ...(signedTx ? { transaction: signedTx } : {}),
        ...(status === 'completed' && !signedTx ? { status: 'cancelled' } : {}),
      } as any, // Using any here because query can contain various properties
    }));
  }, [id, query, signedTx, status, setTransactionsQueue]);

  useEffect(() => {
    if (!id) return undefined;

    let timer: number | undefined;
    let cancelled = false;
    const hasOpener = Boolean(window.opener);
    const leaveQueue = (targetPath = getSuccessReturnPath(query)) => {
      if (hasOpener) {
        window.close();
        return;
      }

      navigate(targetPath, { replace: true });
    };

    const shouldBroadcastSignedTx = status === 'completed' && signedTx && !hasOpener;

    if (!shouldBroadcastSignedTx) {
      timer = window.setTimeout(leaveQueue, 200);
      return () => {
        if (timer) window.clearTimeout(timer);
      };
    }

    if (!sdkInitialized || !staticAeSdk) return undefined;

    const broadcastSignedTx = async () => {
      const storageKey = `txQueue:broadcasted:${signedTx}`;
      const txHash = sessionStorage.getItem(storageKey) || buildTxHash(signedTx as any);
      const continueAfterBroadcast = () => {
        if (query.successAction === 'redirect-post-by-tx') {
          notifyPendingTx(
            {
              type: TxPayloadType.CreatePost,
              content: query.content || '',
              accountAddress: query.accountAddress,
            },
            txHash,
          );
          timer = window.setTimeout(() => leaveQueue('/'), 500);
        } else {
          timer = window.setTimeout(() => leaveQueue(getSuccessReturnPath(query)), 500);
        }
      };

      try {
        if (!sessionStorage.getItem(storageKey)) {
          let broadcastPromise = broadcastInFlight.get(signedTx);
          if (!broadcastPromise) {
            broadcastPromise = staticAeSdk.api.postTransaction({ tx: signedTx })
              .then(() => {
                sessionStorage.setItem(storageKey, txHash);
              })
              .finally(() => {
                broadcastInFlight.delete(signedTx);
              });
            broadcastInFlight.set(signedTx, broadcastPromise);
          }
          await broadcastPromise;
        }

        if (!cancelled) {
          continueAfterBroadcast();
        }
      } catch (err: any) {
        const message = String(err?.message || err?.body?.reason || '');
        if (isAlreadySubmittedError(message)) {
          sessionStorage.setItem(storageKey, txHash);
          if (!cancelled) {
            continueAfterBroadcast();
          }
          return;
        }

        sessionStorage.removeItem(storageKey);
        if (!cancelled) {
          setError(message || 'Failed to submit transaction');
        }
      }
    };

    broadcastSignedTx();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [id, navigate, notifyPendingTx, query, sdkInitialized, signedTx, staticAeSdk, status]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">
        {error || t('processingTransaction')}
      </div>
    </div>
  );
};

export default TxQueue;
