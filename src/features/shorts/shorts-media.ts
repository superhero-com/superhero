const STREAM_ORIGIN = (import.meta.env.VITE_SHORTS_STREAM_URL || 'http://127.0.0.1:3335').replace(/\/$/, '');

export function shortsMediaUrl(id: string, file: 'poster.jpg' | 'captions.vtt') {
  return `${STREAM_ORIGIN}/videos/${encodeURIComponent(id)}/${file}`;
}

export type PlaybackSession = { status: 'preparing' } | { status: 'ready'; manifest: string; expiresAt: number };

export async function shortsPlaybackSession(
  id: string,
  signal: AbortSignal,
): Promise<PlaybackSession> {
  const response = await fetch(`${STREAM_ORIGIN}/videos/${encodeURIComponent(id)}/playback`, {
    method: 'POST',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
  });
  if (!response.ok) throw new Error('Video playback is unavailable');
  const value = await response.json();
  if (response.status === 202 && value.status === 'preparing') return { status: 'preparing' };
  const base = new URL(STREAM_ORIGIN);
  const manifest = new URL(value.manifest, base);
  if (value.status !== 'ready' || manifest.origin !== base.origin
    || manifest.pathname !== `${base.pathname.replace(/\/$/, '')}/videos/${encodeURIComponent(id)}/index.m3u8`
    || !manifest.searchParams.get('token') || !Number.isSafeInteger(value.expiresAt)
    || value.expiresAt <= Date.now() || value.expiresAt > Date.now() + 3600000) throw new Error('Invalid playback session');
  return { status: 'ready', manifest: manifest.href, expiresAt: value.expiresAt };
}
