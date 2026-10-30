import { getOrCreateAnonId } from './anonId';
import { isJourneyEvent, type JourneyEvent } from './events';
import { OTHER_PAGE, sanitizePattern } from './routePattern';

/**
 * Batched, fire-and-forget journey tracker.
 *
 * `track()` only pushes `{n, p, t}` onto an in-memory queue. Sending happens later, off the
 * critical path: when 20 events are waiting, on a 10 s timer handed to `requestIdleCallback`,
 * and when the tab is hidden or unloaded (`sendBeacon`). No retries: a failed send is dropped.
 * Nothing here may throw into the app or block the UI.
 */

export const JOURNEY_PATH = '/api/analytics/journey/events';
export const PAYLOAD_VERSION = 1;
export const QUEUE_CAP = 200;
export const FLUSH_AT = 20;
export const MAX_PER_REQUEST = 50;
export const FLUSH_INTERVAL_MS = 10_000;

export type QueuedEvent = { n: JourneyEvent; p: string; t: number };
export type JourneyPayload = { v: number; a: string; e: QueuedEvent[] };

type NavigatorLike = {
  doNotTrack?: string | null;
  globalPrivacyControl?: boolean;
  sendBeacon?: (url: string, data?: BodyInit | null) => boolean;
};

export type TrackerOptions = {
  /** Full ingest URL, or null to disable (no API configured). */
  endpoint: string | null;
  /** Value of `VITE_JOURNEY_ANALYTICS`; `'false'` turns tracking off. */
  envFlag?: string;
  /** Hard off switch (tests, SSR). */
  disabled?: boolean;
  win?: (Window & typeof globalThis) | undefined;
  getAnonId?: () => string;
  now?: () => number;
};

export type JourneyTracker = {
  track: (name: JourneyEvent, opts?: { page?: string }) => void;
  setPage: (pattern: string) => void;
  flush: (useBeacon?: boolean) => void;
  isEnabled: () => boolean;
  /** For tests: what is waiting to be sent. */
  pending: () => readonly QueuedEvent[];
};

export function isOptedOut(nav: NavigatorLike | undefined, envFlag?: string): boolean {
  if (envFlag === 'false') return true;
  if (!nav) return false;
  return nav.doNotTrack === '1' || nav.globalPrivacyControl === true;
}

export function createJourneyTracker(options: TrackerOptions): JourneyTracker {
  const win = options.win ?? (typeof window !== 'undefined' ? window : undefined);
  const now = options.now ?? (() => Date.now());
  const getAnonId = options.getAnonId ?? (() => getOrCreateAnonId());

  let queue: QueuedEvent[] = [];
  let currentPage = OTHER_PAGE;
  let enabled: boolean | null = null;
  let listening = false;
  let timer: ReturnType<typeof setTimeout> | number | null = null;
  let idleScheduled = false;

  const isEnabled = (): boolean => {
    if (enabled !== null) return enabled;
    try {
      enabled = !options.disabled
        && !!win
        && !!options.endpoint
        && !isOptedOut(win.navigator as NavigatorLike, options.envFlag);
    } catch {
      enabled = false;
    }
    return enabled;
  };

  const send = (events: QueuedEvent[], useBeacon: boolean) => {
    if (!win || !options.endpoint || events.length === 0) return;
    let anonId: string;
    try {
      anonId = getAnonId();
    } catch {
      return;
    }
    const url = options.endpoint;
    for (let i = 0; i < events.length; i += MAX_PER_REQUEST) {
      const payload: JourneyPayload = {
        v: PAYLOAD_VERSION,
        a: anonId,
        e: events.slice(i, i + MAX_PER_REQUEST),
      };
      const body = JSON.stringify(payload);
      let sent = false;
      if (useBeacon) {
        try {
          const nav = win.navigator as NavigatorLike;
          if (typeof nav.sendBeacon === 'function') {
            // text/plain keeps this a "simple" request: no CORS preflight.
            sent = nav.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
          }
        } catch {
          sent = false;
        }
      }
      if (!sent) {
        try {
          const request = win.fetch(url, {
            method: 'POST',
            body,
            keepalive: true,
            credentials: 'omit',
            mode: 'cors',
            headers: { 'Content-Type': 'text/plain' },
          });
          if (request && typeof request.catch === 'function') request.catch(() => {});
        } catch {
          // dropped on purpose: analytics never retries and never surfaces errors
        }
      }
    }
  };

  const flush = (useBeacon = true) => {
    if (timer !== null) {
      try { win?.clearTimeout(timer as number); } catch { /* ignore */ }
      timer = null;
    }
    if (queue.length === 0) return;
    const batch = queue;
    queue = [];
    send(batch, useBeacon);
  };

  const runWhenIdle = () => {
    if (idleScheduled || !win) return;
    idleScheduled = true;
    const run = () => {
      idleScheduled = false;
      flush(true);
    };
    try {
      if (typeof win.requestIdleCallback === 'function') {
        win.requestIdleCallback(run, { timeout: 5_000 });
      } else {
        win.setTimeout(run, 0);
      }
    } catch {
      idleScheduled = false;
    }
  };

  const scheduleTimer = () => {
    if (timer !== null || !win) return;
    try {
      timer = win.setTimeout(() => {
        timer = null;
        runWhenIdle();
      }, FLUSH_INTERVAL_MS);
    } catch {
      timer = null;
    }
  };

  const listen = () => {
    if (listening || !win) return;
    listening = true;
    try {
      win.document?.addEventListener('visibilitychange', () => {
        if (win.document.visibilityState === 'hidden') flush(true);
      });
      win.addEventListener('pagehide', () => flush(true));
    } catch {
      // no listeners: the timer and the size trigger still send
    }
  };

  const track: JourneyTracker['track'] = (name, opts) => {
    try {
      if (!isEnabled() || !isJourneyEvent(name)) return;
      listen();
      const page = opts?.page !== undefined ? sanitizePattern(opts.page) : currentPage;
      queue.push({ n: name, p: page, t: Math.round(now()) });
      if (queue.length > QUEUE_CAP) queue.shift();
      if (queue.length >= FLUSH_AT) runWhenIdle();
      else scheduleTimer();
    } catch {
      // never throw into the caller
    }
  };

  const setPage = (pattern: string) => {
    try {
      currentPage = sanitizePattern(pattern);
    } catch {
      currentPage = OTHER_PAGE;
    }
  };

  return {
    track,
    setPage,
    flush: (useBeacon = true) => {
      try { flush(useBeacon); } catch { /* ignore */ }
    },
    isEnabled,
    pending: () => queue,
  };
}
