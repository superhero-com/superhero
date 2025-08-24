import { atom } from 'jotai';

export type TxQueueEntry = Record<string, any>;

// Transaction queue atom
export const txQueueEntriesAtom = atom<Record<string, TxQueueEntry>>({});

// Actions atom for transaction queue operations
export const txQueueActionsAtom = atom(
  null,
  (get, set, action: { type: 'upsert'; id: string; data: TxQueueEntry } | { type: 'clear'; id?: string }) => {
    const currentEntries = get(txQueueEntriesAtom);
    
    switch (action.type) {
      case 'upsert':
        set(txQueueEntriesAtom, {
          ...currentEntries,
          [action.id]: {
            ...(currentEntries[action.id] || {}),
            ...action.data,
          },
        });
        break;
      case 'clear':
        if (action.id) {
          const newEntries = { ...currentEntries };
          delete newEntries[action.id];
          set(txQueueEntriesAtom, newEntries);
        } else {
          set(txQueueEntriesAtom, {});
        }
        break;
    }
  }
);
