import type { Short } from './types';
import { retryableUploadRead } from './shorts-upload-session';

export class PublicationReviewPending extends Error {
  constructor() {
    super('Your upload is saved and awaiting review. Check its status in Studio.');
    this.name = 'PublicationReviewPending';
  }
}

/** Read the durable request before submitting. Only the first explicit action can enqueue. */
export async function publishAndWait(id: string, options: {
  read: () => Promise<Short>;
  submit: () => Promise<Short>;
  assertCurrent: () => void;
  signal: AbortSignal;
  onWaiting: () => void;
  timeoutMs?: number;
  intervalMs?: number;
}): Promise<Short> {
  const check = () => { options.signal.throwIfAborted(); options.assertCurrent(); };
  const validate = (video: Short) => {
    check();
    if (video.id !== id) throw new Error('Publication did not match your Short. Refresh Studio to continue.');
    return video;
  };
  check();
  let video = validate(await options.read());
  if (video.publicationStatus === 'published') return video;
  if (!video.publicationRequest) {
    if (video.moderation === 'pending') throw new PublicationReviewPending();
    try { video = validate(await options.submit()); } catch (error) {
      check();
      if (!retryableUploadRead(error)) throw error;
      video = validate(await options.read());
      if (!video.publicationRequest && video.publicationStatus !== 'published') throw error;
    }
  }
  const deadline = Date.now() + (options.timeoutMs ?? 1200000);
  let failures = 0;
  for (;;) {
    check();
    if (video.publicationStatus === 'published') return video;
    if (['cancelled', 'reverted'].includes(video.publicationRequest || '')) throw new Error('Your Short could not be published. Its draft is saved in Studio.');
    if (Date.now() >= deadline) throw new Error('Your Short is saved and publication is still pending. Return to it in Studio to check progress.');
    options.onWaiting();
    check();
    // eslint-disable-next-line no-await-in-loop
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout>;
      const abort = () => { clearTimeout(timer); reject(options.signal.reason); };
      timer = setTimeout(() => { options.signal.removeEventListener('abort', abort); resolve(); }, Math.min(options.intervalMs ?? 3000, deadline - Date.now()));
      options.signal.addEventListener('abort', abort, { once: true });
    });
    check();
    try {
      // eslint-disable-next-line no-await-in-loop
      video = validate(await options.read());
      failures = 0;
    } catch (error) {
      check(); failures += 1;
      if (!retryableUploadRead(error) || failures >= 5) throw error;
    }
  }
}
