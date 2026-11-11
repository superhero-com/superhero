import { API_BASE_URL } from '@/config';

export const SHORTS_API = (import.meta.env.VITE_SHORTS_API_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:3334' : API_BASE_URL)).replace(/\/$/, '');
export class ShortsApiError extends Error {
  constructor(message: string, public status: number, public retryAfter?: string | null) {
    super(message);
    this.name = 'ShortsApiError';
  }
}
export async function request<T>(path: string, body?: unknown, token?: string, options?: { keepalive?: boolean; timeout?: number; signal?: AbortSignal }): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch(`${SHORTS_API}/api/shorts${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(import.meta.env.DEV ? { 'X-Shorts-Local': '1' } : {}),
      ...(body !== undefined && !form ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form ? body : JSON.stringify(body),
    signal: options?.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(options?.timeout ?? 180000)])
      : AbortSignal.timeout(options?.timeout ?? 180000),
    keepalive: options?.keepalive,
  });
  if (!response.ok) {
    // A proxy can throttle a request before it reaches the JSON API.
    const error = await response.json().catch(() => null);
    const message = error?.message || `Request failed (${response.status})`;
    throw new ShortsApiError(message, response.status, response.headers?.get('Retry-After'));
  }
  return response.json() as Promise<T>;
}
