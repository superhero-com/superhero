// Keep backpressure recovery brief. A longer server delay requires an explicit
// retry instead of sending a request earlier than the server permits.
export const PLAYBACK_RETRY_WINDOW_MS = 30000;

export function playbackRetryDelay(status: number, header: string | null, attempt: number) {
  if (![429, 503].includes(status) || attempt >= 2) return null;
  const value = header?.trim();
  let requested = 0;
  if (value && /^\d+$/.test(value)) requested = Number(value) * 1000;
  else if (value) {
    const date = Date.parse(value);
    if (Number.isFinite(date)) requested = Math.max(0, date - Date.now());
  }
  const delay = Math.max(1000 * (2 ** attempt), requested);
  return delay <= PLAYBACK_RETRY_WINDOW_MS ? delay : null;
}

export function waitForPlaybackRetry(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout>;
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}
