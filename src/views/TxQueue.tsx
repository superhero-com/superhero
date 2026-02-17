import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { transactionsQueueAtom } from '../atoms/txQueueAtoms';

const TxQueue = () => {
  const { t } = useTranslation('transactions');
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [, setTransactionsQueue] = useAtom(transactionsQueueAtom);

  useEffect(() => {
    let timer: number | undefined;
    if (id) {
      // Parse query parameters
      const query = Object.fromEntries(new URLSearchParams(location.search).entries());
      const normalizeSignedTx = (value: unknown): string | undefined => {
        if (typeof value !== 'string') return undefined;
        const trimmed = value.trim();
        if (!trimmed || trimmed === '{transaction}' || trimmed === 'undefined' || trimmed === 'null') {
          return undefined;
        }
        return trimmed.startsWith('tx_') ? trimmed : undefined;
      };
      const signedTx = normalizeSignedTx(
        (query as any).transaction
        ?? (query as any).signedTransaction
        ?? (query as any).signed_tx
        ?? (query as any).tx,
      );
      const status = String((query as any).status || '').toLowerCase();

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

      // Close current tab after a short delay
      timer = window.setTimeout(() => {
        window.close();
      }, 200);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [id, location.search, setTransactionsQueue]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">{t('processingTransaction')}</div>
    </div>
  );
};

export default TxQueue;
