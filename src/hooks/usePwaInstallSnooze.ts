/**
 * Dismissal memory for the PWA install affordances.
 *
 * Both the install card and the mobile FAB previously had no durable dismissal:
 * the card kept its dismissed flag in component state, so it returned on the
 * next reload, and the FAB had no dismiss control at all while pulsing every
 * nine seconds for the life of the page. A user who has decided not to install
 * had no way to say so.
 *
 * The state is shared rather than per-instance because on mobile Android BOTH
 * affordances are mounted at once — the card just renders null until a
 * `beforeinstallprompt` arrives. Holding the flag in `useState` meant each read
 * its own copy at mount, so dismissing the FAB and then receiving a late prompt
 * surfaced the card the user had already refused.
 *
 * The snooze is per-browser convenience state, so localStorage is the right home
 * and a failed read is not an error — a private window, cleared site data, or a
 * browser blocking storage must all degrade to "not snoozed", never to a throw.
 */
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'sh:pwa-install-snoozed-until';
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function readSnoozedUntil(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const until = Number.parseInt(raw, 10);
    return Number.isFinite(until) ? until : 0;
  } catch {
    // Storage can throw outright (Safari private mode, blocked site data).
    return 0;
  }
}

let snoozedUntil = readSnoozedUntil();
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  // Re-read per subscriber, keeping the old per-mount freshness: another tab may
  // have written since this module was evaluated.
  snoozedUntil = readSnoozedUntil();
  listeners.add(onStoreChange);
  return () => { listeners.delete(onStoreChange); };
}

/** A boolean, so React's snapshot check is a value comparison and cannot loop. */
function getSnapshot(): boolean {
  return snoozedUntil > Date.now();
}

function getServerSnapshot(): boolean {
  return false;
}

/** Dismiss for the snooze window, on every mounted affordance at once. */
function snooze(): void {
  // Flip the shared value first: the affordances must disappear even where the
  // write fails.
  snoozedUntil = Date.now() + SNOOZE_MS;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(snoozedUntil));
  } catch { /* dismissal is then session-only, which is still better than never */ }
  listeners.forEach((notify) => notify());
}

export interface UsePwaInstallSnoozeResult {
  /** True while a dismissal is still in effect. */
  isSnoozed: boolean;
  /** Dismiss for the snooze window. */
  snooze: () => void;
}

export function usePwaInstallSnooze(): UsePwaInstallSnoozeResult {
  const isSnoozed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isSnoozed, snooze };
}
