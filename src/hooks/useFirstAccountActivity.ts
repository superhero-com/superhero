import { useQuery } from '@tanstack/react-query';
import { CURRENT_NETWORK } from '../utils/constants';

export async function fetchFirstAccountActivity(
  middlewareUrl: string,
  address: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const params = new URLSearchParams({ account: address, direction: 'forward', limit: '1' });
  const response = await fetch(`${middlewareUrl.replace(/\/$/, '')}/v3/transactions?${params}`, { signal });
  if (!response.ok) throw new Error(`First account activity request failed: ${response.status}`);
  const payload = await response.json();
  const timestamp: unknown = payload?.data?.[0]?.micro_time;
  // MDW v3 micro_time is Unix milliseconds, despite the field name.
  // Missing or invalid history must never become an invented joined date.
  return typeof timestamp === 'number'
    && Number.isSafeInteger(timestamp)
    && timestamp > 0
    && timestamp <= Date.now()
    ? timestamp : null;
}

export default function useFirstAccountActivity(address: string) {
  const { middlewareUrl, networkId } = CURRENT_NETWORK;
  return useQuery({
    queryKey: ['firstAccountActivity', networkId, middlewareUrl, address],
    queryFn: ({ signal }) => fetchFirstAccountActivity(middlewareUrl, address, signal),
    enabled: /^ak_[1-9A-HJ-NP-Za-km-z]{48,56}$/.test(address),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
