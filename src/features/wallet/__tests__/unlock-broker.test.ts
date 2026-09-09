// @vitest-environment node
//
// The broker is the only thing standing between "the SDK asked for a signature"
// and "a KEK was released". Its two custody-relevant properties are asserted
// here: it FAILS CLOSED when no confirmation UI is mounted, and a request can be
// settled exactly once.
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  NO_PROMPT_MOUNTED, requestUnlock, resetUnlockBroker, subscribeUnlockRequests,
  type UnlockRequest,
} from '../unlock-broker';
import type { VaultRecord } from '../vault-record';

const RECORD = { v: 1, factors: [] } as unknown as VaultRecord;
const KEK = { fake: 'kek' } as unknown as CryptoKey;

describe('unlock broker', () => {
  beforeEach(() => resetUnlockBroker());
  afterEach(() => resetUnlockBroker());

  it('FAILS CLOSED when no prompt host is mounted — never hangs, never signs', async () => {
    await expect(requestUnlock(RECORD)).rejects.toThrow(NO_PROMPT_MOUNTED);
  });

  it('fails closed again after the host unsubscribes', async () => {
    const unsubscribe = subscribeUnlockRequests(() => {});
    unsubscribe();
    await expect(requestUnlock(RECORD)).rejects.toThrow(NO_PROMPT_MOUNTED);
  });

  it('hands the record and the signing context to the mounted host', async () => {
    let seen: UnlockRequest | undefined;
    subscribeUnlockRequests((request) => {
      seen = request;
      request.resolve({ factorId: 'f1', kek: KEK });
    });

    const context = { kind: 'transaction' as const, payload: 'tx_abc', networkId: 'ae_uat' };
    await expect(requestUnlock(RECORD, context)).resolves.toEqual({ factorId: 'f1', kek: KEK });
    expect(seen?.record).toBe(RECORD);
    expect(seen?.context).toEqual(context);
  });

  it('rejects with the host’s error when the user cancels', async () => {
    subscribeUnlockRequests((request) => request.reject(new Error('cancelled by user')));
    await expect(requestUnlock(RECORD)).rejects.toThrow('cancelled by user');
  });

  it('settles exactly once — a second resolve/reject from the host is ignored', async () => {
    let captured: UnlockRequest | undefined;
    subscribeUnlockRequests((request) => { captured = request; });

    const promise = requestUnlock(RECORD);
    captured!.resolve({ factorId: 'first', kek: KEK });
    captured!.resolve({ factorId: 'second', kek: KEK });
    captured!.reject(new Error('too late'));

    await expect(promise).resolves.toEqual({ factorId: 'first', kek: KEK });
  });

  it('gives each request a distinct id so a host can queue them', () => {
    const ids: number[] = [];
    subscribeUnlockRequests((request) => {
      ids.push(request.id);
      request.reject(new Error('drain'));
    });

    requestUnlock(RECORD).catch(() => {});
    requestUnlock(RECORD).catch(() => {});

    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('a later host replaces the earlier one (single-prompt invariant)', async () => {
    const first = vi.fn();
    subscribeUnlockRequests(first);
    subscribeUnlockRequests((request) => request.resolve({ factorId: 'second-host', kek: KEK }));

    await expect(requestUnlock(RECORD)).resolves.toEqual({ factorId: 'second-host', kek: KEK });
    expect(first).not.toHaveBeenCalled();
  });
});
