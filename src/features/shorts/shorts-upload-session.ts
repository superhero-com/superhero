import { ShortsApiError } from './api';
import type { Short } from './types';

export interface UploadSession {
  id: string;
  parts: number[];
  partSize: number;
  transport?: 'direct-s3-v1';
  expires: number;
  complete: boolean;
  status: 'uploading' | 'queued' | 'processing' | 'ready' | 'failed';
  error?: string;
  video?: Short;
}

export function uploadResumeKey(api: string, network: string, contract: string, actor: string) {
  return `shorts.upload.${JSON.stringify([api, network, contract, actor])}`;
}

export function retryableUploadRead(error: unknown) {
  return error instanceof TypeError
    || (error instanceof DOMException && error.name === 'TimeoutError')
    || (error instanceof ShortsApiError && (error.status === 429 || error.status >= 500));
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    let timer: ReturnType<typeof setTimeout>;
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}

/** Follow an accepted server job; status reads never resubmit preparation or publication. */
export async function waitForPreparedShort(initial: UploadSession, options: {
  read: () => Promise<UploadSession>;
  assertCurrent: () => void;
  onStatus: (status: UploadSession['status']) => void;
  signal: AbortSignal;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<Short> {
  const deadline = Date.now() + (options.timeoutMs ?? 600000);
  let session = initial;
  let failures = 0;
  for (;;) {
    options.signal.throwIfAborted();
    options.assertCurrent();
    if (session.id !== initial.id) throw new Error('Upload status did not match your video. Please refresh Studio.');
    if (session.status === 'ready' && session.complete && session.video?.id === initial.id) return session.video;
    if (session.status === 'failed') throw new Error(session.error || 'We could not prepare this video. Please try again.');
    if (!['queued', 'processing'].includes(session.status)) throw new Error('Your upload has not finished. Please try again.');
    if (Date.now() >= deadline) throw new Error('Your video is saved and is still being prepared. You can return to this upload to continue.');
    options.onStatus(session.status);
    // Retry only status reads. Preparation and publication remain explicit actions.
    // eslint-disable-next-line no-await-in-loop
    await wait(Math.min((options.intervalMs ?? 1000) * 2 ** failures, 5000, deadline - Date.now()), options.signal);
    options.assertCurrent();
    try {
      // eslint-disable-next-line no-await-in-loop
      session = await options.read();
      failures = 0;
    } catch (error) {
      options.signal.throwIfAborted();
      options.assertCurrent();
      failures += 1;
      if (!retryableUploadRead(error) || failures >= 5) throw error;
    }
  }
}
