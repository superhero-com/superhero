/**
 * Typed error for token-gated-room relay rejections, split out of `gated-room.ts`
 * to keep one class per file. `kind` normalises the relay's free-text reason so
 * callers can branch on AUTH-required vs not-a-member.
 */

/**
 * Why a gated-room read/write was rejected by the relay:
 *   - `notMember`    — `unknown member` / `restricted` / `blocked`
 *   - `authRequired` — `auth-required` / `restricted` (run NIP-42 AUTH, retry)
 *   - `unknown`      — anything else
 */
export type GatedRoomErrorReason = 'notMember' | 'authRequired' | 'unknown';

/** Map a relay's free-text reason to a typed {@link GatedRoomErrorReason}. */
export function classifyReason(reason: string): GatedRoomErrorReason {
  if (/auth-required/i.test(reason)) return 'authRequired';
  if (/unknown member|not a member|restricted|blocked/i.test(reason)) {
    return 'notMember';
  }
  return 'unknown';
}

/** Thrown when a kind-9 post is rejected by the relay. */
export class GatedRoomPublishError extends Error {
  readonly reason: string;

  readonly kind: GatedRoomErrorReason;

  constructor(reason: string) {
    super(reason);
    this.name = 'GatedRoomPublishError';
    this.reason = reason;
    this.kind = classifyReason(reason);
  }

  /** Relay demanded NIP-42 AUTH (we can authenticate and retry). */
  get isAuthRequired(): boolean {
    return this.kind === 'authRequired';
  }

  /** User is not a member of the closed group (must hold the token + link). */
  get isNotMember(): boolean {
    return this.kind === 'notMember';
  }
}
