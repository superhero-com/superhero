import {
  buildTx,
  buildTxHash,
  decode,
  Encoding,
  hash,
  isAddressValid,
  Tag,
  unpackTx,
  verifySignature,
} from '@aeternity/aepp-sdk';
import { AciContractCallEncoder } from '@aeternity/aepp-calldata';

export type WalletScope = { api: string; network: string; address: string; contract: string };
export type WalletMethod = 'paid_like' | 'claim' | 'withdraw';
export type WalletIntent = WalletScope & { method: WalletMethod; videoId?: string; amount: string };
export type WalletAction = WalletIntent & {
  version: 1;
  id: string;
  createdAt: number;
  tx?: string;
  nonce?: number;
  // Missing on older signed records: treat those as possibly submitted.
  submission?: 'prepared' | 'attempted';
};
export type WalletObservation = Omit<WalletScope, 'api'> & {
  tx: string;
  status: 'unknown' | 'submitted' | 'mined' | 'confirmed' | 'failed' | 'reorged';
  confirmations: number;
  confirmationsRequired: number;
  method?: WalletMethod;
  videoId?: string;
  amount?: string;
  nonce?: number;
  blockHash?: string;
  blockHeight?: number;
  result?: string;
};
export interface WalletActionStorage {
  // The callback and write must run in one serializable transaction across tabs.
  change(
    scope: WalletScope,
    edit: (value: unknown) => WalletAction | undefined,
  ): Promise<WalletAction | undefined>;
}
export const walletScopeKey = (scope: WalletScope) => JSON.stringify([
  scope.api, scope.network, scope.address, scope.contract,
]);
const methods: WalletMethod[] = ['paid_like', 'claim', 'withdraw'];
const encoder = new AciContractCallEncoder([
  {
    contract: {
      name: 'Shorts',
      kind: 'contract_main',
      typedefs: [],
      functions: methods.map((name) => ({
        name,
        arguments: name === 'claim' ? [] : [{ name: 'id', type: 'string' }],
        returns: { tuple: [] },
        payable: name === 'paid_like',
        stateful: true,
      })),
    },
  },
]);
const validHash = (value: unknown, prefix: string) => {
  try {
    return (
      typeof value === 'string'
      && value.startsWith(prefix)
      && decode(value as `th_${string}`).length === 32
    );
  } catch {
    return false;
  }
};
function validate(value: unknown, scope: WalletScope): WalletAction | undefined {
  if (value === undefined) return undefined;
  const record = value as WalletAction;
  if (
    !record
    || record.version !== 1
    || walletScopeKey(record) !== walletScopeKey(scope)
    || !methods.includes(record.method)
    || !/^[0-9a-f-]{36}$/.test(record.id)
    || !Number.isSafeInteger(record.createdAt)
    || record.createdAt < 0
    || !/^(0|[1-9]\d{0,39})$/.test(record.amount)
    || (record.method === 'claim'
      ? record.videoId !== undefined
      : typeof record.videoId !== 'string' || record.videoId.length > 128)
    || (record.tx === undefined
      ? record.nonce !== undefined
      : !validHash(record.tx, 'th_') || !Number.isSafeInteger(record.nonce) || record.nonce! <= 0)
    || (record.submission !== undefined
      && (!record.tx || !['prepared', 'attempted'].includes(record.submission)))
  ) {
    throw new Error(
      'Saved wallet activity could not be read. Check your wallet history before another transaction.',
    );
  }
  return record;
}

/** Public context only. No seed, signature, raw signed bytes, token or private media. */
export function indexedWalletStorage(): WalletActionStorage {
  return {
    change: (scope, edit) => new Promise((resolve, reject) => {
      let database: IDBDatabase | undefined;
      let transaction: IDBTransaction | undefined;
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      let failure: unknown;
      let result: WalletAction | undefined;
      const finish = (error?: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        database?.close();
        if (error) reject(error);
        else resolve(result);
      };
      timer = setTimeout(() => {
        // Abort before rejecting: a late callback must never store a signature hash
        // after its caller has already been told persistence failed.
        try {
          transaction?.abort();
        } catch {
          /* Already completed. */
        }
        finish(new Error('Wallet recovery storage is unavailable. No new transaction was sent.'));
      }, 5000);
      try {
        const open = indexedDB.open('superhero-shorts-wallet-actions', 1);
        open.onupgradeneeded = () => {
          open.result.createObjectStore('pending');
        };
        open.onerror = () => finish(open.error);
        open.onblocked = () => finish(new Error('Close other Superhero tabs to open wallet recovery storage.'));
        open.onsuccess = () => {
          database = open.result;
          if (settled) {
            database.close();
            return;
          }
          database.onversionchange = () => database?.close();
          try {
            transaction = database.transaction('pending', 'readwrite', { durability: 'strict' });
            transaction.oncomplete = () => finish();
            transaction.onabort = () => finish(
              failure || transaction?.error || new Error('Wallet recovery could not be saved.'),
            );
            transaction.onerror = () => {
              failure ||= transaction?.error;
            };
            const store = transaction.objectStore('pending');
            const key = walletScopeKey(scope);
            const read = store.get(key);
            read.onsuccess = () => {
              if (settled) return;
              try {
                result = edit(read.result);
                if (result === undefined) store.delete(key);
                else store.put(result, key);
              } catch (error) {
                failure = error;
                  transaction!.abort();
              }
            };
          } catch (error) {
            finish(error);
          }
        };
      } catch (error) {
        finish(error);
      }
    }),
  };
}

export function validateObservation(record: WalletAction, input: unknown): WalletObservation {
  const value = input as WalletObservation;
  if (
    !value
    || !record.tx
    || value.tx !== record.tx
    || value.address !== record.address
    || value.contract !== record.contract
    || value.network !== record.network
    || value.confirmationsRequired !== 3
    || !Number.isSafeInteger(value.confirmations)
    || value.confirmations < 0
    || !['unknown', 'submitted', 'mined', 'confirmed', 'failed', 'reorged'].includes(value.status)
    || (value.status !== 'unknown'
      && (value.method !== record.method
        || value.videoId !== record.videoId
        || value.amount !== record.amount
        || value.nonce !== record.nonce))
    || (['unknown', 'submitted', 'reorged'].includes(value.status) && value.confirmations !== 0)
    || (['mined', 'confirmed', 'failed'].includes(value.status)
      && (!validHash(value.blockHash, 'mh_')
        || !Number.isSafeInteger(value.blockHeight)
        || value.blockHeight! < 0
        || !['ok', 'revert', 'error'].includes(value.result || '')))
    || (value.status === 'mined' && (value.confirmations < 1 || value.confirmations >= 3))
    || (['confirmed', 'failed'].includes(value.status)
      && (value.confirmations < 3
        || (value.status === 'confirmed' ? value.result !== 'ok' : value.result === 'ok')))
  ) {
    throw new Error(
      'Wallet status could not be verified. Keep this action pending and check again.',
    );
  }
  return value;
}

/** Reject unintended unsigned requests before the external wallet can display them. */
export function assertUnsignedWalletRequest(record: WalletIntent, unsigned: `tx_${string}`, network: string) {
  const call = unpackTx(unsigned, Tag.ContractCallTx);
  if (network !== record.network || call.callerId !== record.address || call.contractId !== record.contract
    || BigInt(call.amount).toString() !== record.amount
    || call.callData !== encoder.encodeCall('Shorts', record.method, record.method === 'claim' ? [] : [record.videoId])) {
    throw new Error('The wallet request does not match this Shorts action. It was not opened.');
  }
}

export class WalletJournal {
  constructor(private readonly storage: WalletActionStorage = indexedWalletStorage()) {}

  read(scope: WalletScope) {
    return this.storage.change(scope, (value) => validate(value, scope));
  }

  async begin(intent: WalletIntent) {
    if (
      intent.network !== 'ae_uat'
      || !isAddressValid(intent.address, Encoding.AccountAddress)
      || !isAddressValid(intent.contract, Encoding.ContractAddress)
    ) throw new Error('Wallet recovery requires the configured testnet wallet and contract.');
    const record: WalletAction = {
      ...intent,
      id: crypto.randomUUID(),
      version: 1,
      createdAt: Date.now(),
    };
    validate(record, intent);
    await this.storage.change(intent, (value) => {
      const saved = validate(value, intent);
      if (saved) throw new Error('Check your pending wallet action before starting another.');
      return record;
    });
    return record;
  }

  async signed(
    record: WalletAction,
    unsigned: `tx_${string}`,
    signed: `tx_${string}`,
    network: string,
  ) {
    assertUnsignedWalletRequest(record, unsigned, network);
    const envelope = unpackTx(signed, Tag.SignedTx);
    const requested = unpackTx(unsigned, Tag.ContractCallTx);
    const signedCall = buildTx(envelope.encodedTx);
    const call = unpackTx(signedCall, Tag.ContractCallTx);
    const binary = decode(signedCall);
    if (
      network !== record.network
      || envelope.signatures.length !== 1
      // SH deep links refresh the nonce. Preserve every other requested byte,
      // including fee, gas, TTL and caller, and verify the actual signed nonce.
      || buildTx({ ...call, nonce: requested.nonce }) !== unsigned
      || call.callerId !== record.address
      || call.contractId !== record.contract
      || BigInt(call.amount).toString() !== record.amount
      || call.callData
        !== encoder.encodeCall(
          'Shorts',
          record.method,
          record.method === 'claim' ? [] : [record.videoId],
        )
      // Match the SDK verifier: both network-prefixed signing formats are valid.
      || ![hash(binary), binary].some((payload) => verifySignature(
        new Uint8Array([...new TextEncoder().encode(network), ...payload]),
        envelope.signatures[0],
        record.address as `ak_${string}`,
      ))
    ) {
      throw new Error('The signed transaction does not match this wallet action. It was not sent.');
    }
    const next: WalletAction = {
      ...record, tx: buildTxHash(signed), nonce: call.nonce, submission: 'prepared',
    };
    await this.storage.change(record, (value) => {
      const saved = validate(value, record);
      if (saved?.id !== record.id || saved.tx) throw new Error('This wallet request is no longer active. It was not sent.');
      return validate(next, record);
    });
    return next;
  }

  cancelUnsigned(record: WalletAction) {
    return this.storage.change(record, (value) => {
      const saved = validate(value, record);
      if (saved?.id !== record.id || saved.tx) throw new Error('This action may have been sent. Check its status before continuing.');
      return undefined;
    });
  }

  // Commit before the SDK's postTransaction call. Cancellation and submission
  // race through the same IDB transaction, so at most one can win across tabs.
  attemptSubmission(record: WalletAction, raw: `tx_${string}`) {
    const tx = buildTxHash(raw);
    return this.storage.change(record, (value) => {
      const saved = validate(value, record);
      if (saved?.id !== record.id || saved.tx !== tx || saved.submission !== 'prepared') {
        throw new Error('This wallet request is no longer active. It was not sent.');
      }
      return { ...saved, submission: 'attempted' };
    });
  }

  cancelUnsent(record: WalletAction) {
    return this.storage.change(record, (value) => {
      const saved = validate(value, record);
      if (saved?.id !== record.id || (saved.tx && saved.submission !== 'prepared')) {
        throw new Error('This action may have been sent. Check its status before continuing.');
      }
      return undefined;
    });
  }

  // Only a fresh matching terminal observation may release a signed action.
  async finish(record: WalletAction, observation: unknown) {
    const result = validateObservation(record, observation);
    if (!['confirmed', 'failed'].includes(result.status)) throw new Error('The wallet outcome is still unknown. Do not send it again.');
    return this.storage.change(record, (value) => {
      const saved = validate(value, record);
      if (saved?.id !== record.id || saved.tx !== record.tx) throw new Error('Wallet activity changed. Check its status again.');
      return undefined;
    });
  }
}
