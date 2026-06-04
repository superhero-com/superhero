import { Encoded } from '@aeternity/aepp-sdk';
import { atom, SetStateAction } from 'jotai';

export type TxQueueEntry = {
  status: string;
  signUrl: string;
  tx?: Encoded.Transaction;
  transaction?: Encoded.Transaction;
  message?: string;
  signature?: string;
};

export type MessageSignRequest = {
  type: 'address-link-x-submit';
  address: string;
  value: string;
  nonce: number;
  verification_token: string;
  message: string;
} | {
  type: 'address-link-x-unclaim';
  address: string;
  nonce: number;
  message: string;
} | {
  type: 'address-link-bio-submit';
  address: string;
  value: string;
  nonce: number;
  verification_token: string;
  message: string;
} | {
  type: 'address-link-bio-unclaim';
  address: string;
  nonce: number;
  message: string;
} | {
  type: 'address-link-prefaens-submit';
  address: string;
  value: string;
  nonce: number;
  verification_token: string;
  message: string;
} | {
  type: 'address-link-prefaens-unclaim';
  address: string;
  nonce: number;
  message: string;
} | {
  type: 'address-link-site-submit';
  address: string;
  value: string;
  nonce: number;
  verification_token: string;
  message: string;
} | {
  type: 'address-link-site-unclaim';
  address: string;
  nonce: number;
  message: string;
} | {
  type: 'profile-update';
  address: string;
  payload: Record<string, string>;
  // The signed challenge string. Required so the tx-queue callback can submit the PATCH
  // itself when the wallet returns in a standalone tab with no opener polling.
  message: string;
};

export const TX_QUEUE_ACK_CHANNEL = 'txQueue:ack';
export const TX_QUEUE_RESULT_PREFIX = 'txQueue:result:';
export const TX_QUEUE_REQUEST_PREFIX = 'txQueue:request:';

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
