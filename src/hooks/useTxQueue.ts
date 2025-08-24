import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { txQueueEntriesAtom, txQueueActionsAtom, TxQueueEntry } from '../atoms/txQueueAtoms';

export const useTxQueue = () => {
  const [entries] = useAtom(txQueueEntriesAtom);
  const [, dispatch] = useAtom(txQueueActionsAtom);

  const upsertEntry = useCallback((id: string, data: TxQueueEntry) => {
    { type: 'upsert', id, data };
  }, [dispatch]);

  const clearEntry = useCallback((id?: string) => {
    { type: 'clear', id };
  }, [dispatch]);

  const clearAllEntries = useCallback(() => {
    { type: 'clear' };
  }, [dispatch]);

  return {
    // State
    entries,
    
    // Actions
    upsertEntry,
    clearEntry,
    clearAllEntries,
  };
};
