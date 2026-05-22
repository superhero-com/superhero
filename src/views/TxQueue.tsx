import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAtom } from 'jotai';
import {
  TX_QUEUE_ACK_CHANNEL,
  TX_QUEUE_REQUEST_PREFIX,
  TX_QUEUE_RESULT_PREFIX,
  type MessageSignRequest,
  transactionsQueueAtom,
} from '../atoms/txQueueAtoms';
import { SuperheroApi } from '../api/backend';
import { safeLocalStringStorage } from '../utils/jotaiSafeLocalStorage';
import {
  normalizeLinkSignature,
  verifyLinkMessageSignature,
} from '../utils/signLinkMessage';

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

const normalizeSignature = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed || trimmed === '{signature}' || trimmed === 'undefined' || trimmed === 'null') {
    return undefined;
  }
  return trimmed;
};

const parseMessageSignRequest = (raw: string | null): MessageSignRequest | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MessageSignRequest>;
    if (
      (parsed.type === 'address-link-x-submit' || parsed.type === 'address-link-x-unclaim')
      && typeof parsed.address === 'string'
      && typeof parsed.message === 'string'
      && typeof parsed.nonce === 'number'
    ) {
      return parsed as MessageSignRequest;
    }
  } catch {
    // ignore malformed persisted queue data
  }
  return null;
};

const submitMessageSignRequest = async (
  request: MessageSignRequest,
  rawSignature: string,
) => {
  const signature = normalizeLinkSignature(rawSignature);
  const isValid = verifyLinkMessageSignature(request.address, request.message, signature);
  if (!isValid) {
    throw new Error('Wallet signature verification failed locally');
  }

  if (request.type === 'address-link-x-submit') {
    await SuperheroApi.submitXAddressLink({
      address: request.address,
      value: request.value,
      nonce: request.nonce,
      signature,
      verification_token: request.verification_token,
    });
    return;
  }

  await SuperheroApi.submitXAddressLinkUnclaim({
    address: request.address,
    nonce: request.nonce,
    signature,
  });
};

const TxQueue = () => {
  const { t } = useTranslation('transactions');
  const { t: tCommon } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [, setTransactionsQueue] = useAtom(transactionsQueueAtom);
  const [messageResult, setMessageResult] = useState<{
    status: 'success' | 'error';
    message: string;
    address?: string;
  } | null>(null);

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

  const signature = useMemo(
    () => normalizeSignature((query as any).signature),
    [query],
  );

  const status = useMemo(
    () => String((query as any).status || '').toLowerCase(),
    [query],
  );

  useEffect(() => {
    let timer: number | undefined;
    let ackChannel: BroadcastChannel | null = null;
    let acked = false;
    let fallbackStarted = false;

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
      const isCompleted = status === 'completed' && Boolean(signedTx || signature);
      setTransactionsQueue((prevQueue) => ({
        ...prevQueue,
        [id]: {
          ...prevQueue[id], // Keep existing data
          ...query, // Merge in new query data
          ...(signedTx ? { transaction: signedTx } : {}),
          ...(signature ? { signature } : {}),
          ...(isCompleted ? { status: 'completed' } : {}),
          ...(status === 'completed' && !signedTx && !signature ? { status: 'cancelled' } : {}),
        } as any, // Using any here because query can contain various properties
      }));
      safeLocalStringStorage.setItem(
        `${TX_QUEUE_RESULT_PREFIX}${id}`,
        JSON.stringify({
          ...query,
          ...(signedTx ? { transaction: signedTx } : {}),
          ...(signature ? { signature } : {}),
          ...(isCompleted ? { status: 'completed' } : {}),
          ...(status === 'completed' && !signedTx && !signature ? { status: 'cancelled' } : {}),
        }),
      );

      // Android Chrome may open the callback in a temporary tab while the original
      // app tab is still alive. Give that tab a moment to acknowledge the relay
      // before closing or navigating away.
      timer = window.setTimeout(async () => {
        if (acked) return;

        const storedRequestKey = `${TX_QUEUE_REQUEST_PREFIX}${id}`;
        const request = parseMessageSignRequest(safeLocalStringStorage.getItem(storedRequestKey));
        if (!request || !signature || window.opener) {
          leaveQueue();
          return;
        }

        if (fallbackStarted) return;
        fallbackStarted = true;

        try {
          await submitMessageSignRequest(request, signature);
          safeLocalStringStorage.removeItem(storedRequestKey);
          safeLocalStringStorage.removeItem(`${TX_QUEUE_RESULT_PREFIX}${id}`);
          setMessageResult({
            status: 'success',
            address: request.address,
            message: request.type === 'address-link-x-submit'
              ? tCommon('messages.xCallbackSuccess')
              : tCommon('messages.xCallbackUnlinkSuccess'),
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('[tx-queue] failed to resume message signing request', error);
          setMessageResult({
            status: 'error',
            address: request.address,
            message: error instanceof Error ? error.message : String(error || 'Request failed'),
          });
        }
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
    signature,
    signedTx,
    status,
    setTransactionsQueue,
    tCommon,
  ]);

  if (messageResult) {
    return (
      <div className="h-screen w-screen flex items-center justify-center px-6 text-center">
        <div className="space-y-4">
          <p className={messageResult.status === 'success' ? 'text-white/80 text-lg' : 'text-red-300 text-lg'}>
            {messageResult.message}
          </p>
          {messageResult.address && (
            <button
              type="button"
              className="text-[var(--neon-teal)] underline"
              onClick={() => navigate(`/users/${messageResult.address}`)}
            >
              {tCommon('messages.xCallbackGoToProfile')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">
        {t('processingTransaction')}
      </div>
    </div>
  );
};

export default TxQueue;
