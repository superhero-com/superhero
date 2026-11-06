import { API_BASE_URL } from '@/config';
import type { JourneyEvent } from './events';
import { createJourneyTracker, JOURNEY_PATH, type JourneyTracker } from './tracker';

let tracker: JourneyTracker | null = null;

function isTestOrServer(): boolean {
  if (typeof window === 'undefined') return true;
  const env = (import.meta as any)?.env;
  return env?.MODE === 'test' || !!env?.VITEST;
}

function getTracker(): JourneyTracker {
  if (!tracker) {
    const env = (import.meta as any)?.env ?? {};
    tracker = createJourneyTracker({
      endpoint: API_BASE_URL ? `${API_BASE_URL}${JOURNEY_PATH}` : null,
      envFlag: env.VITE_JOURNEY_ANALYTICS,
      disabled: isTestOrServer(),
    });
  }
  return tracker;
}

/**
 * Record one journey step. Call it at the success point of an action, never before.
 * Never pass anything that identifies a person, wallet, token or post: the only inputs are
 * the step name and (optionally) a route pattern. Never throws, never blocks.
 */
export function track(name: JourneyEvent, opts?: { page?: string }): void {
  try {
    getTracker().track(name, opts);
  } catch {
    // analytics must never break the app
  }
}

/** Remember the current route pattern; events default to it. */
export function setJourneyPage(pattern: string): void {
  try {
    getTracker().setPage(pattern);
  } catch {
    // ignore
  }
}
