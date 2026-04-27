import { Encoded } from '@aeternity/aepp-sdk';
import { atom, SetStateAction } from 'jotai';

export type TxQueueEntry = {
  status: string;
  tx: Encoded.Transaction;
  signUrl: string;
  transaction?: Encoded.Transaction;
};

export const TX_QUEUE_ACK_CHANNEL = 'txQueue:ack';
export const TX_QUEUE_RESULT_PREFIX = 'txQueue:result:';
export const TX_QUEUE_RESULT_TTL_MS = 5 * 60 * 1000;

// atomWithBroadcast implementation for cross-tab communication
function atomWithBroadcast<Value>(key: string, initialValue: Value) {
  const baseAtom = atom(initialValue);
  const listeners = new Set<(event: MessageEvent<any>) => void>();
  const channel = new BroadcastChannel(key);

  channel.onmessage = (event) => {
    listeners.forEach((l) => l(event));
  };

  const broadcastAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: { isEvent: boolean; value: SetStateAction<Value> }) => {
      set(baseAtom, update.value);

      if (!update.isEvent) {
        channel.postMessage(get(baseAtom));
      }
    },
  );

  broadcastAtom.onMount = (setAtom) => {
    const listener = (event: MessageEvent<any>) => {
      setAtom({ isEvent: true, value: event.data });
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  };

  const returnedAtom = atom(
    (get) => get(broadcastAtom),
    (_get, set, update: SetStateAction<Value>) => {
      set(broadcastAtom, { isEvent: false, value: update });
    },
  );

  return returnedAtom;
}

// Transaction queue atom with broadcast for cross-tab communication
export const transactionsQueueAtom = atomWithBroadcast<Record<string, TxQueueEntry>>('txQueue:transactions', {});
