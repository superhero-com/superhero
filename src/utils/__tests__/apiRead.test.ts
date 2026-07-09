import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  fetchNameRecord,
  fetchTransactionRecord,
  isTransactionMined,
} from '@/utils/apiRead';

const mockFetch = vi.fn();

vi.mock('@/config', () => ({
  CONFIG: {
    NODE_URL: 'https://node.example',
    MIDDLEWARE_URL: 'https://mdw.example',
  },
}));

describe('apiRead', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('falls back to middleware when node returns no data', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ownership: { current: 'ak_owner' } }),
      });

    const record = await fetchNameRecord('taken.chain');
    expect(record).toMatchObject({ ownership: { current: 'ak_owner' } });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(String(mockFetch.mock.calls[0][0])).toContain('https://node.example');
    expect(String(mockFetch.mock.calls[1][0])).toContain('https://mdw.example');
  });

  it('treats positive block_height as mined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ block_height: 42 }),
    });
    await expect(isTransactionMined('th_mined')).resolves.toBe(true);
  });

  it('treats pending and unmined heights as not mined', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ block_height: -1 }),
    });
    await expect(isTransactionMined('th_pending')).resolves.toBe(false);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blockHeight: 0 }),
    });
    await expect(isTransactionMined('th_zero')).resolves.toBe(false);
  });

  it('accepts camelCase blockHeight from middleware', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ blockHeight: 99 }),
    });
    await expect(isTransactionMined('th_camel')).resolves.toBe(true);
  });

  it('returns null when all API bases fail', async () => {
    mockFetch.mockResolvedValue({ ok: false });
    await expect(fetchTransactionRecord('th_missing')).resolves.toBeNull();
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
