import { playbackRetryDelay, PLAYBACK_RETRY_WINDOW_MS, waitForPlaybackRetry } from './playback-retry';
import { ShortsApiError } from './api';

const STREAM_ORIGIN = (import.meta.env.VITE_SHORTS_STREAM_URL || 'http://127.0.0.1:3335').replace(/\/$/, '');

export function shortsMediaUrl(id: string, file: 'poster.jpg' | 'captions.vtt') {
  return `${STREAM_ORIGIN}/videos/${encodeURIComponent(id)}/${file}`;
}

export type PlaybackSession = { status: 'preparing' } | { status: 'ready'; manifest: string; expiresAt: number; token: string };

export async function shortsPlaybackSession(
  id: string,
  signal: AbortSignal,
  measurementSession?: string,
): Promise<PlaybackSession> {
  const viewer = measurementSession && crypto.subtle
    ? Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(measurementSession))))
      .map((byte) => byte.toString(16).padStart(2, '0')).join('') : undefined;
  const deadline = Date.now() + PLAYBACK_RETRY_WINDOW_MS;
  const request = async (attempt: number): Promise<Response> => {
    signal.throwIfAborted();
    const response = await fetch(`${STREAM_ORIGIN}/videos/${encodeURIComponent(id)}/playback`, {
      method: 'POST',
      headers: viewer ? { 'X-Playback-Viewer': viewer } : undefined,
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    });
    const delay = playbackRetryDelay(response.status, response.headers.get('Retry-After'), attempt);
    if (delay === null || Date.now() + delay > deadline) return response;
    await response.body?.cancel();
    await waitForPlaybackRetry(delay, signal);
    return request(attempt + 1);
  };
  const response = await request(0);
  if (!response.ok) throw new Error('Video playback is unavailable');
  const value = await response.json();
  if (response.status === 202 && value.status === 'preparing') return { status: 'preparing' };
  const base = new URL(STREAM_ORIGIN);
  const manifest = new URL(value.manifest, base);
  if (value.status !== 'ready' || manifest.origin !== base.origin
    || manifest.pathname !== `${base.pathname.replace(/\/$/, '')}/videos/${encodeURIComponent(id)}/index.m3u8`
    || !manifest.searchParams.get('token') || !Number.isSafeInteger(value.expiresAt)
    || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 3600000) throw new Error('Invalid playback session');
  return {
    status: 'ready', manifest: manifest.href, expiresAt: value.expiresAt, token: manifest.searchParams.get('token')!,
  };
}

export async function shortsPlaybackProof(id: string, token: string): Promise<string> {
  const response = await fetch(`${STREAM_ORIGIN}/videos/${encodeURIComponent(id)}/measurement`, {
    headers: { 'X-Playback-Token': token },
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    keepalive: true,
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ShortsApiError('Playback measurement unavailable', response.status);
  }
  const value = await response.json();
  if (typeof value.proof !== 'string' || value.proof.length > 2048 || !/^m1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(value.proof)) throw new Error('Invalid playback measurement');
  return value.proof;
}
