/**
 * P4 integration — the bridge between the (React-free) inline signer and the
 * in-page unlock + WYSIWYS confirmation UI.
 *
 * `InlineWalletSigner` calls an `UnlockProvider` on EVERY signature (build-plan
 * §3.2/§5.4). That provider must (a) show the user exactly what is about to be
 * signed and (b) perform user-verification — a WebAuthn PRF ceremony or the
 * passphrase prompt — before it returns a KEK. Both are React concerns, but the
 * signer is installed into the SDK as a plain object with no access to the React
 * tree. This module is the (tiny, testable) queue between them:
 *
 *   signer ──requestUnlock(record, context)──▶ [broker] ──▶ WalletSignPrompt
 *          ◀───────── {factorId, kek} / rejection ─────────
 *
 * Two properties this file is responsible for, both custody-relevant:
 *
 *  - **Fail closed.** If no prompt host is mounted, `requestUnlock` REJECTS
 *    immediately instead of hanging. A signature must never be produced without
 *    a user actually seeing and confirming it, and a promise that never settles
 *    would leave the SDK wedged rather than making the fault visible.
 *  - **One prompt at a time.** Requests are handed to the host in order and the
 *    host renders the head of its queue, so two concurrent sign calls cannot
 *    spawn overlapping WebAuthn ceremonies or let a user approve request B while
 *    looking at request A's payload.
 *
 * This module holds NO key material and NO decrypted state. It moves a
 * `CryptoKey` (the KEK, already non-extractable) from the prompt to the signer
 * and forgets it.
 */
import type { SigningContext, UnlockProvider } from './inline-signer';
import type { VaultRecord } from './vault-record';

export const NO_PROMPT_MOUNTED = 'inline wallet: no unlock prompt is mounted — refusing to sign';
export const UNLOCK_CANCELLED = 'inline wallet: cancelled';

export interface UnlockResult {
  factorId: string;
  kek: CryptoKey;
}

/** One pending unlock, handed to the prompt host to render and settle. */
export interface UnlockRequest {
  /** Monotonic id — the host uses it as a React key. */
  id: number;
  /** The encrypted vault; the host reads `factors` to offer the right unlocks. */
  record: VaultRecord;
  /**
   * What is being signed. Present for every signature (WYSIWYS — the host MUST
   * render it before releasing a KEK); absent for non-signing unlocks such as
   * enrolling an extra factor.
   */
  context?: SigningContext;
  resolve: (result: UnlockResult) => void;
  reject: (error: Error) => void;
}

type Listener = (request: UnlockRequest) => void;

let listener: Listener | null = null;
let nextId = 1;

/**
 * Mount the prompt host. Returns an unsubscribe function; unsubscribing while
 * requests are in flight makes subsequent ones fail closed (see above).
 * Single-host by design — a second host replaces the first.
 */
export function subscribeUnlockRequests(cb: Listener): () => void {
  listener = cb;
  return () => {
    if (listener === cb) listener = null;
  };
}

/** Test seam: drop any mounted host. */
export function resetUnlockBroker(): void {
  listener = null;
}

/**
 * The `UnlockProvider` handed to `createInlineSdkAccount`. Publishes the request
 * to the mounted prompt and resolves with the KEK the user's verification
 * produced. Guarded so a host can only settle each request once.
 */
export const requestUnlock: UnlockProvider = (
  record: VaultRecord,
  context?: SigningContext,
) => new Promise<UnlockResult>((resolve, reject) => {
  if (!listener) {
    reject(new Error(NO_PROMPT_MOUNTED));
    return;
  }
  let settled = false;
  const once = <T>(fn: (value: T) => void) => (value: T) => {
    if (settled) return;
    settled = true;
    fn(value);
  };
  nextId += 1;
  listener({
    id: nextId, record, context, resolve: once(resolve), reject: once(reject),
  });
});
