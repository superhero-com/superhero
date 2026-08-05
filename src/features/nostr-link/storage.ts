/**
 * 24h dismissal cooldown for the "Enable Chat" prompt. Ported from the app's
 * AsyncStorage version to the web's synchronous `localStorage`. This value is
 * NOT secret (it is only a timestamp) — unlike the derived nostr key, which is
 * memory-only and never persisted (see `@/features/chat/identity`).
 */
const NOSTR_LINK_DISMISSED_KEY = 'nostr_link_dismissed_at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function wasDismissedRecently(): boolean {
  try {
    const val = localStorage.getItem(NOSTR_LINK_DISMISSED_KEY);
    if (!val) return false;
    return Date.now() - parseInt(val, 10) < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markDismissed(): void {
  try {
    localStorage.setItem(NOSTR_LINK_DISMISSED_KEY, String(Date.now()));
  } catch {
    // Non-fatal: a blocked localStorage just means the prompt reappears sooner.
  }
}

export function clearDismissal(): void {
  try {
    localStorage.removeItem(NOSTR_LINK_DISMISSED_KEY);
  } catch {
    // Non-fatal.
  }
}
