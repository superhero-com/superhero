import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { fetchOnChainPayout, parseOnChainPayout } from '../onChainPayout';

vi.mock('@/config', () => ({
  CONFIG: {
    MIDDLEWARE_URL: 'https://mdw.test/mdw/',
    NODE_URL: 'https://node.test',
  },
}));

const USER = 'ak_user';
const HASH = 'th_payout';

// Shaped like a real middleware record requested with int-as-string=true.
const mdwRecord = (overrides: Record<string, unknown> = {}, tx: Record<string, unknown> = {}) => ({
  hash: HASH,
  block_height: '1356579',
  micro_time: '1790105836387',
  tx: {
    type: 'SpendTx',
    sender_id: 'ak_rewards',
    recipient_id: USER,
    amount: '50000000000000000000', // 50 AE: past Number.MAX_SAFE_INTEGER
    ...tx,
  },
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('parseOnChainPayout', () => {
  it('verifies a mined spend to the wallet, with the exact amount and block time', () => {
    expect(parseOnChainPayout(mdwRecord(), USER)).toEqual({
      mined: true,
      verified: true,
      amountAe: '50',
      time: new Date(1790105836387).toISOString(),
    });
  });

  it('keeps small amounts exact', () => {
    const parsed = parseOnChainPayout(mdwRecord({}, { amount: '50000000000000000' }), USER);
    expect(parsed.amountAe).toBe('0.05');
  });

  it("does not verify someone else's transfer", () => {
    // A hash that resolves to a payment to another wallet must never show as
    // this wallet's reward.
    expect(parseOnChainPayout(mdwRecord({}, { recipient_id: 'ak_other' }), USER)).toEqual({
      mined: true, verified: false, amountAe: null, time: null,
    });
  });

  it('does not verify a transaction that is not a plain spend', () => {
    expect(parseOnChainPayout(mdwRecord({}, { type: 'ContractCallTx' }), USER).verified).toBe(false);
  });

  it('does not verify a transaction still waiting for a block', () => {
    expect(parseOnChainPayout(mdwRecord({ block_height: -1 }), USER)).toEqual({
      mined: false, verified: false, amountAe: null, time: null,
    });
  });

  it('verifies from a node record, which carries no block time', () => {
    const nodeRecord: Record<string, unknown> = mdwRecord();
    delete nodeRecord.micro_time;
    expect(parseOnChainPayout(nodeRecord, USER)).toMatchObject({
      verified: true, amountAe: '50', time: null,
    });
  });
});

describe('fetchOnChainPayout', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the middleware first, asking for amounts as strings', async () => {
    fetchMock.mockResolvedValue(jsonResponse(mdwRecord()));

    await expect(fetchOnChainPayout(HASH, USER)).resolves.toMatchObject({ verified: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mdw.test/mdw/v3/transactions/th_payout?int-as-string=true',
    );
  });

  it('falls back to the node when the middleware cannot answer', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: 'not found' }, 404))
      .mockResolvedValueOnce(jsonResponse(mdwRecord({ micro_time: undefined })));

    await expect(fetchOnChainPayout(HASH, USER)).resolves.toMatchObject({
      verified: true, amountAe: '50', time: null,
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://node.test/v3/transactions/th_payout?int-as-string=true',
    );
  });

  it('returns null when neither source answers, so the row keeps the API data', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(fetchOnChainPayout(HASH, USER)).resolves.toBeNull();
  });

  it('never has more than four reads in flight', async () => {
    let inFlight = 0;
    let peak = 0;
    const releases: Array<() => void> = [];
    fetchMock.mockImplementation(() => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      return new Promise((resolve) => {
        releases.push(() => {
          inFlight -= 1;
          resolve(jsonResponse(mdwRecord()));
        });
      });
    });

    let done = false;
    const all = Promise.all(
      Array.from({ length: 10 }, (_, i) => fetchOnChainPayout(`th_${i}`, USER)),
    ).finally(() => { done = true; });
    // Let whatever is in flight finish, a batch at a time, until all ten have.
    while (!done) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => { setTimeout(r, 0); });
      releases.splice(0).forEach((release) => release());
    }

    const results = await all;
    expect(results).toHaveLength(10);
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1);
  });
});
