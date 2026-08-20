// Inline mentions for post/comment content.
//
// A mention is stored INSIDE the on-chain post `content` string using the same
// tokens the render pipeline (`utils/linkify`) already understands, so no API or
// contract change is needed and existing posts stay backwards compatible:
//   - an account  -> `@ak_...`  (the account address; renders as an avatar chip)
//   - a token     -> `#name`    (the token name; renders as a price chip)
// The compose-side picker below only decides which token to insert; the render
// side is unchanged in shape.

export type MentionTrigger = 'account' | 'token';

export interface ActiveMention {
  trigger: MentionTrigger;
  /** The text typed after the trigger char, without the `@`/`#`. */
  query: string;
  /** Index of the trigger char (`@`/`#`) in the source text. */
  start: number;
  /** Caret index — exclusive end of the in-progress token. */
  end: number;
}

// Characters allowed in the live token while typing. Account tokens accept the
// address/chain-name set; token tokens accept the (possibly non-Latin) name set.
const ACCOUNT_QUERY_RE = /^[A-Za-z0-9_.-]*$/;
const TOKEN_QUERY_RE = /^[\p{L}\p{N}_-]*$/u;

// A trigger is only a mention when it starts the text or follows whitespace —
// this keeps `a@b.com` (emails) and `example.com/page#x` (URL fragments) inert,
// mirroring how `utils/linkify` protects the same shapes at render time.
const TRIGGER_RE = /(^|\s)([@#])(\S*)$/u;

/**
 * Detect an in-progress `@account` / `#token` mention immediately before the caret.
 * Returns `null` when the caret is not inside a mention token.
 */
export function detectActiveMention(text: string, caret: number): ActiveMention | null {
  if (typeof text !== 'string' || caret < 0 || caret > text.length) return null;
  const before = text.slice(0, caret);
  const match = before.match(TRIGGER_RE);
  if (!match) return null;

  const trigger = match[2];
  const run = match[3];
  const start = caret - run.length - 1; // index of the trigger char

  if (trigger === '@') {
    if (!ACCOUNT_QUERY_RE.test(run)) return null;
    return {
      trigger: 'account', query: run, start, end: caret,
    };
  }
  if (!TOKEN_QUERY_RE.test(run)) return null;
  return {
    trigger: 'token', query: run, start, end: caret,
  };
}

/** The token stored in post content for a tagged account: the raw address. */
export function buildAccountMentionToken(account: { address: string }): string {
  return `@${account.address}`;
}

/** The token stored in post content for a tagged token: `#name` (falls back to symbol). */
export function buildTokenMentionToken(
  token: { name?: string | null; symbol?: string | null },
): string {
  const tag = String(token.name || token.symbol || '').trim();
  return `#${tag}`;
}

/**
 * Replace the in-progress mention token with the chosen `token`, followed by a
 * single space (unless one already follows). Returns the new text and the caret
 * position to place after the inserted token.
 */
export function applyMention(
  text: string,
  active: ActiveMention,
  token: string,
): { text: string; caret: number } {
  const head = text.slice(0, active.start);
  const tail = text.slice(active.end);
  const needsSpace = tail.length === 0 || !/^\s/.test(tail);
  const inserted = needsSpace ? `${token} ` : token;
  return {
    text: `${head}${inserted}${tail}`,
    caret: head.length + inserted.length,
  };
}
