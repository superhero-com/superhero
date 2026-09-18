import { ApiError } from '../api/generated';

export type SocialGraphAction = 'follow' | 'unfollow' | 'block' | 'unblock';

/**
 * Contract abort codes, shared by the advisory precheck (HTTP body `error`)
 * and the on-chain `require(...)` reason a signed transaction reverts with.
 */
export const SOCIAL_GRAPH_CODES = [
  'ALREADY_FOLLOWING',
  'NOT_FOLLOWING',
  'ALREADY_BLOCKED',
  'NOT_BLOCKED',
  'CANNOT_FOLLOW_SELF',
  'CANNOT_BLOCK_SELF',
  'BLOCKED',
  'BLOCKED_BY_SELF',
  'MAX_FOLLOWING_REACHED',
  'MAX_BLOCKED_REACHED',
  'FOLLOW_COOLDOWN',
] as const;

export type SocialGraphCode = (typeof SOCIAL_GRAPH_CODES)[number];

/**
 * Bucket A: stale-state races and self-target guards. The user never caused a
 * real problem, so we re-read the relationship and repaint silently — no toast.
 */
export const SILENT_RECONCILE_CODES: ReadonlySet<string> = new Set<SocialGraphCode>([
  'ALREADY_FOLLOWING',
  'NOT_FOLLOWING',
  'ALREADY_BLOCKED',
  'NOT_BLOCKED',
  'CANNOT_FOLLOW_SELF',
  'CANNOT_BLOCK_SELF',
]);

/**
 * Pull the abort code out of whatever threw. Two sources carry it:
 *  - the generated client's `ApiError` from `POST /social-graph/precheck`
 *    (`body.error` / `body.message`, both set to the code);
 *  - an on-chain revert from aepp-sdk, where the `require(...)` reason is
 *    embedded in the error message (e.g. `... aborted with: BLOCKED`).
 */
export function extractSocialGraphCode(error: unknown): SocialGraphCode | null {
  if (error instanceof ApiError) {
    const body = error.body as { error?: string; message?: string } | undefined;
    const fromBody = body?.error ?? body?.message;
    if (fromBody && (SOCIAL_GRAPH_CODES as readonly string[]).includes(fromBody)) {
      return fromBody as SocialGraphCode;
    }
  }

  let message = '';
  if (error instanceof Error) message = error.message;
  else if (typeof error === 'string') message = error;

  if (message) {
    // Match the longest codes first so BLOCKED_BY_SELF is not shadowed by BLOCKED.
    const byLength = [...SOCIAL_GRAPH_CODES].sort((a, b) => b.length - a.length);
    const matched = byLength.find((code) => new RegExp(`\\b${code}\\b`).test(message));
    if (matched) return matched;
  }

  return null;
}

export type SocialGraphErrorInfo =
  | { kind: 'silent'; code: SocialGraphCode }
  | {
      kind: 'surface';
      /** null when unmapped — the copy falls back to generic, never the raw error. */
      code: SocialGraphCode | null;
      /** i18n key under `common.socialGraph.errors`. */
      messageKey: string;
      values?: Record<string, string>;
      /** BLOCKED_BY_SELF wants an inline unblock affordance next to the message. */
      offerUnblock?: boolean;
    };

function formatCap(value?: number): string {
  return typeof value === 'number' ? value.toLocaleString() : '';
}

/**
 * Map a thrown error to how the UI should react. Caps come from the on-chain
 * config so the copy states the real limit rather than a hard-coded number.
 */
export function classifySocialGraphError(
  error: unknown,
  config?: { max_following?: number; max_blocked?: number },
): SocialGraphErrorInfo {
  const code = extractSocialGraphCode(error);

  if (code && SILENT_RECONCILE_CODES.has(code)) {
    return { kind: 'silent', code };
  }

  switch (code) {
    case 'BLOCKED':
      return { kind: 'surface', code, messageKey: 'socialGraph.errors.blocked' };
    case 'BLOCKED_BY_SELF':
      return {
        kind: 'surface',
        code,
        messageKey: 'socialGraph.errors.blockedBySelf',
        offerUnblock: true,
      };
    case 'MAX_FOLLOWING_REACHED':
      return {
        kind: 'surface',
        code,
        messageKey: 'socialGraph.errors.maxFollowing',
        values: { max: formatCap(config?.max_following) },
      };
    case 'MAX_BLOCKED_REACHED':
      return {
        kind: 'surface',
        code,
        messageKey: 'socialGraph.errors.maxBlocked',
        values: { max: formatCap(config?.max_blocked) },
      };
    case 'FOLLOW_COOLDOWN':
      return { kind: 'surface', code, messageKey: 'socialGraph.errors.cooldown' };
    default:
      return { kind: 'surface', code: null, messageKey: 'socialGraph.errors.generic' };
  }
}
