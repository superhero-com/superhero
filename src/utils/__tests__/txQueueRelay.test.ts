import {
  afterEach, beforeAll, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  broadcastSignedTransaction,
  clearSignRequestPending,
  getTxNonce,
  isNonceUsed,
  isSignRequestVisible,
  markSignRequestPending,
  shouldBroadcastFromCallback,
} from '../txQueueRelay';

const SIGNED_TX = 'tx_signed' as any;

// Own in-memory Storage so the tests don't depend on the runtime's localStorage.
const store = new Map<string, string>();
const testStorage = {
  getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
  setItem: (key: string, value: string) => { store.set(key, String(value)); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] ?? null,
  get length() { return store.size; },
};

describe('txQueueRelay', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, value: testStorage });
  });

  beforeEach(() => {
    store.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('shouldBroadcastFromCallback', () => {
    const base = {
      id: 'abc', signedTx: SIGNED_TX, broadcastAllowed: true, hasOpener: false,
    };

    it('broadcasts when the requesting tab is not visible from the callback tab', () => {
      expect(shouldBroadcastFromCallback(base)).toBe(true);
    });

    it('leaves it to the requester when its pending marker is visible (shared storage)', () => {
      markSignRequestPending('abc');
      expect(isSignRequestVisible('abc')).toBe(true);
      expect(shouldBroadcastFromCallback(base)).toBe(false);
      clearSignRequestPending('abc');
      expect(isSignRequestVisible('abc')).toBe(false);
    });

    it('never broadcasts without a signed tx, without permission, or with an opener', () => {
      expect(shouldBroadcastFromCallback({ ...base, signedTx: undefined })).toBe(false);
      expect(shouldBroadcastFromCallback({ ...base, broadcastAllowed: false })).toBe(false);
      expect(shouldBroadcastFromCallback({ ...base, hasOpener: true })).toBe(false);
    });

    it('still works when localStorage throws (private mode / blocked storage)', () => {
      vi.spyOn(testStorage, 'getItem').mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });
      vi.spyOn(testStorage, 'setItem').mockImplementation(() => {
        throw new DOMException('quota', 'QuotaExceededError');
      });
      expect(() => markSignRequestPending('abc')).not.toThrow();
      expect(shouldBroadcastFromCallback(base)).toBe(true);
    });
  });

  describe('broadcastSignedTransaction', () => {
    it('returns the tx hash from the node', async () => {
      const postTransaction = vi.fn().mockResolvedValue({ txHash: 'th_1' });
      await expect(broadcastSignedTransaction({ postTransaction }, SIGNED_TX)).resolves.toBe('th_1');
      expect(postTransaction).toHaveBeenCalledWith({ tx: SIGNED_TX });
    });

    it('rejects instead of hanging when the node never answers', async () => {
      vi.useFakeTimers();
      const postTransaction = vi.fn(() => new Promise<{ txHash: string }>(() => {}));
      const result = broadcastSignedTransaction({ postTransaction }, SIGNED_TX, 1000);
      const assertion = expect(result).rejects.toThrow('Transaction broadcast timeout');
      await vi.advanceTimersByTimeAsync(1000);
      await assertion;
    });
  });

  describe('isNonceUsed', () => {
    it('is true once the account nonce reaches the tx nonce', async () => {
      const node = { getAccountByPubkey: vi.fn().mockResolvedValue({ nonce: 5 }) };
      await expect(isNonceUsed(node, 'ak_1', 5)).resolves.toBe(true);
      await expect(isNonceUsed(node, 'ak_1', 6)).resolves.toBe(false);
    });

    it('treats lookup errors as not yet used', async () => {
      const node = { getAccountByPubkey: vi.fn().mockRejectedValue(new Error('404')) };
      await expect(isNonceUsed(node, 'ak_1', 1)).resolves.toBe(false);
    });
  });

  describe('getTxNonce', () => {
    it('returns null for an undecodable tx', () => {
      expect(getTxNonce('tx_garbage' as any)).toBeNull();
    });
  });
});
