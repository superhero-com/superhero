// Inline @account / #token mentions live inside on-chain post content, using the
// tokens `utils/linkify` already parses — no API or contract change.

export type MentionTrigger = 'account' | 'token';

export interface ActiveMention {
  trigger: MentionTrigger;
  query: string;
  start: number;
  end: number;
}

const ACCOUNT_QUERY_RE = /^[A-Za-z0-9_.-]*$/;
const TOKEN_QUERY_RE = /^[\p{L}\p{N}_-]*$/u;
// A trigger must start the text or follow whitespace, so `a@b.com` and URL `#frags` stay inert.
const TRIGGER_RE = /(^|\s)([@#])(\S*)$/u;

/** Detect an in-progress `@account` / `#token` at the caret, or null. */
export function detectActiveMention(text: string, caret: number): ActiveMention | null {
  if (typeof text !== 'string' || caret < 0 || caret > text.length) return null;
  const before = text.slice(0, caret);
  const match = before.match(TRIGGER_RE);
  if (!match) return null;

  const trigger = match[2];
  const run = match[3];
  const start = caret - run.length - 1;

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

/**
 * Token stored for a tagged account: an explicit `[account:{address}]` macro. The
 * `]` terminator bounds the token by format (not by charset), the macro cannot be
 * produced by accident, and it is a pure client contract — `superhero-api` does
 * not index `ak_` mentions. Raw `ak_` addresses in content stay plain links.
 */
export function buildAccountMentionToken(account: { address: string }): string {
  return `[account:${account.address}]`;
}

/** Token stored for a tagged token: `#name` (falls back to symbol). */
export function buildTokenMentionToken(
  token: { name?: string | null; symbol?: string | null },
): string {
  const tag = String(token.name || token.symbol || '').trim();
  return `#${tag}`;
}

// A name only round-trips if every char is one `linkify` renders inside a `#tag`
// (letters/digits/dash + the loaded collections' chars, capped at 50); names with
// '.' or '_' truncate on render, so such tokens are dropped from the picker.
export function isRenderableTokenName(name: string, allowedCharsPattern = ''): boolean {
  if (!name) return false;
  return new RegExp(`^[A-Za-z0-9\\-${allowedCharsPattern}]{1,50}$`, 'u').test(name);
}

/** Replace the in-progress token with `token` + a trailing space (unless one follows). */
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
