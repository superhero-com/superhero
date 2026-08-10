/**
 * Per-account 24h dismissal cooldown for the "Enable Chat" prompt. Ported from
 * the app's AsyncStorage version to the web's synchronous `localStorage`.
 *
 * The cooldown is keyed by æ address: dismissing on one account must NOT silence
 * the link prompt on another, or a second wallet would skip the AE↔Nostr gate
 * without ever being asked. This value is NOT secret (only a timestamp) — unlike
 * the derived nostr key, which is memory-only and never persisted (see
 * `@/features/chat/identity`).
 */
const NOSTR_LINK_DISMISSED_PREFIX = 'nostr_link_dismissed_at:';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const dismissKey = (address: string) => `${NOSTR_LINK_DISMISSED_PREFIX}${address}`;

export function wasDismissedRecently(address: string): boolean {
  try {
    const val = localStorage.getItem(dismissKey(address));
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markDismissed(address: string): void {
  try {
    localStorage.setItem(dismissKey(address), String(Date.now()));
  } catch {
    // Non-fatal: a blocked localStorage just means the prompt reappears sooner.
  }
}

export function clearDismissal(address: string): void {
  try {
    localStorage.removeItem(dismissKey(address));
  } catch {
    // Non-fatal.
  }
}
