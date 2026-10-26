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

// Public submission receipts bridge the account indexer's delay and 10-minute
// account cache. They only suppress duplicate registration UI: they never unlock
// a signer or grant room access. Always read the API before using this fallback.
const submissionKey = (api: string, address: string) => (
  `nostr_link_submitted:${api}:${address}`
);

export function rememberNostrSubmission(
  api: string,
  address: string,
  npub: string,
  txHash: string,
) {
  try {
    localStorage.setItem(submissionKey(api, address), JSON.stringify({
      npub, txHash, submittedAt: Date.now(),
    }));
  } catch {
    // Storage can be unavailable; the API remains the source of truth.
  }
}

export function clearNostrSubmission(api: string, address: string) {
  try {
    localStorage.removeItem(submissionKey(api, address));
  } catch {
    // Non-fatal.
  }
}

interface NostrSubmission {
  npub: string;
  txHash: string;
  submittedAt: number;
}

export function readNostrSubmission(api: string, address: string): NostrSubmission | null {
  try {
    const raw = localStorage.getItem(submissionKey(api, address));
    if (!raw) return null;
    const receipt = JSON.parse(raw);
    const age = Date.now() - receipt.submittedAt;
    if (typeof receipt.npub !== 'string' || !receipt.npub.startsWith('npub1')
      || typeof receipt.txHash !== 'string' || !receipt.txHash.startsWith('th_')
      || !Number.isFinite(receipt.submittedAt) || age < 0) {
      clearNostrSubmission(api, address);
      return null;
    }
    return receipt;
  } catch {
    return null;
  }
}
