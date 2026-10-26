/**
 * Dismissal memory for the "Set up your Superhero account" card.
 *
 * Kept per account: another account signed in on the same browser still gets
 * its own card. Shared rather than per-instance because the home feed and the
 * right rail both render the card at once on desktop, and closing one has to
 * close both.
 *
 * The steps themselves stay on the rewards page and in the profile editor, so
 * this only hides the reminder.
 *
 * Per-device convenience state, so localStorage is the right home and a failed
 * read is not an error: a private window or blocked site data just means the
 * card shows.
 */
import { useCallback, useSyncExternalStore } from 'react';

export const REWARDS_ONBOARDING_DISMISSED_KEY_PREFIX = 'sh:rewards-onboarding-dismissed:';

const storageKey = (address: string) => `${REWARDS_ONBOARDING_DISMISSED_KEY_PREFIX}${address}`;

// Dismissed while this page has been open. Keeps the card closed after a click
// even where the write below fails.
const dismissedThisSession = new Set<string>();
const listeners = new Set<() => void>();

function readStoredDismissal(address: string): boolean {
  try {
    return window.localStorage.getItem(storageKey(address)) === '1';
  } catch {
    // Storage can throw outright (Safari private mode, blocked site data).
    return false;
  }
}

function isDismissed(address: string | null | undefined): boolean {
  if (!address) return false;
  return dismissedThisSession.has(address) || readStoredDismissal(address);
}

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => { listeners.delete(onStoreChange); };
}

function dismissFor(address: string): void {
  // Flip the shared value first: the card must close even where the write fails.
  dismissedThisSession.add(address);
  try {
    window.localStorage.setItem(storageKey(address), '1');
  } catch { /* dismissal is then session-only */ }
  listeners.forEach((notify) => notify());
}

export interface UseRewardsOnboardingDismissalResult {
  /** True once this account has closed the card on this device. */
  dismissed: boolean;
  /** Close the card for this account, on every mounted copy at once. */
  dismiss: () => void;
}

export function useRewardsOnboardingDismissal(
  address: string | null | undefined,
): UseRewardsOnboardingDismissalResult {
  const dismissed = useSyncExternalStore(
    subscribe,
    () => isDismissed(address),
    () => false,
  );
  const dismiss = useCallback(() => {
    if (address) dismissFor(address);
  }, [address]);
  return { dismissed, dismiss };
}
