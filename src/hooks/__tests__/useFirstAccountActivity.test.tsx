import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import useFirstAccountActivity, { fetchFirstAccountActivity } from '../useFirstAccountActivity';

const ADDRESS = 'ak_2bhQHRQCzfgiw5QYnNmoFiza9ZZ4iSQCrEG46pJjZfXRQ7P9x8';
const TIMESTAMP = 1776388760147;
const respond = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('first account activity', () => {
  it('requests one oldest transaction and preserves MDW milliseconds, including incoming transfers', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respond([
      { micro_time: TIMESTAMP, tx: { recipient_id: ADDRESS } },
    ]));
    vi.stubGlobal('fetch', fetchMock);
    const { signal } = new AbortController();
    expect(await fetchFirstAccountActivity('https://testnet.aeternity.io/mdw/', ADDRESS, signal)).toBe(TIMESTAMP);
    expect(fetchMock).toHaveBeenCalledWith(
      `https://testnet.aeternity.io/mdw/v3/transactions?account=${ADDRESS}&direction=forward&limit=1`,
      { signal },
    );
  });

  it.each([[], [{}], [{ micro_time: null }], [{ micro_time: '1776388760147' }], [{ micro_time: -1 }], [{ micro_time: 0 }], [{ micro_time: 1e20 }]])('omits absent or invalid dates: %j', async (data) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respond(data)));
    expect(await fetchFirstAccountActivity('https://mdw.example', ADDRESS)).toBeNull();
  });

  it('propagates HTTP failures for query retry without inventing a date', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchFirstAccountActivity('https://mdw.example', ADDRESS)).rejects.toThrow('503');
  });

  it('does not request history for an unresolved chain name', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    renderHook(() => useFirstAccountActivity('alice.chain'), { wrapper });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the previous account date while the next account loads', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(respond([{ micro_time: TIMESTAMP }]))
      .mockImplementation(() => new Promise(() => {})));
    const { result, rerender } = renderHook(({ address }) => useFirstAccountActivity(address), {
      wrapper, initialProps: { address: ADDRESS },
    });
    await waitFor(() => expect(result.current.data).toBe(TIMESTAMP));
    rerender({ address: 'ak_Nzdoqsxm1HieHaJbaPE6W2vUK7NBvuvShWcFtA1NS2RjfDRsF' });
    expect(result.current.data).toBeUndefined();
  });
});
