// Inline @account / #token mentions live inside on-chain post content, using the
// tokens `utils/linkify` already parses — no API or contract change.

import { formatAddress } from '@/utils/address';

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

/**
 * A mention the user picked from the composer picker. `display` is the short run
 * shown in the textarea (`@marek.chain`); `serialized` is what it becomes on the
 * wire (`[account:{address}]` for accounts, `#name` for tokens — identical there).
 * The composer keeps display and storage split so the mirror overlay can pill the
 * run without the 57-char macro leaking into the input.
 */
export interface AppliedMention {
  trigger: MentionTrigger;
  display: string;
  serialized: string;
}

/** Short in-textarea display run for a tagged account — `@name`, or `@ak_…` short address. */
export function buildAccountMentionDisplay(
  account: { address: string; chainName?: string | null },
): string {
  const name = account.chainName?.trim();
  return name ? `@${name}` : `@${formatAddress(account.address, 6, true)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A mention run is bounded the same way `detectActiveMention` bounds it: it starts
// the text or follows whitespace, and ends at whitespace or end of text. Editing the
// run so it no longer matches these bounds is the correct way to drop the tag.
function mentionRunRegex(display: string): RegExp {
  return new RegExp(`(^|\\s)(${escapeRegExp(display)})(?=\\s|$)`, 'g');
}

/**
 * Convert every intact display run to its on-the-wire form. A run the user has since
 * edited no longer matches its `display` and is left as the plain text it now is.
 */
export function serializeMentions(text: string, mentions: AppliedMention[]): string {
  return mentions.reduce(
    (out, m) => (m.display === m.serialized // token mentions are already 1:1
      ? out
      : out.replace(mentionRunRegex(m.display), (_full, lead) => `${lead}${m.serialized}`)),
    text,
  );
}

export interface MentionSegment {
  text: string;
  mention: AppliedMention | null;
}

/**
 * Split `text` into ordered segments, tagging each intact mention run with its
 * `AppliedMention` so the overlay mirror can pill it. Plain runs carry `mention: null`.
 * Widths are untouched — the segment text is the exact run the textarea holds.
 */
export function segmentMentions(text: string, mentions: AppliedMention[]): MentionSegment[] {
  if (!text) return [];
  const hits: Array<{ start: number; end: number; mention: AppliedMention }> = [];
  mentions.forEach((m) => {
    if (!m.display) return;
    const re = mentionRunRegex(m.display);
    let match: RegExpExecArray | null = re.exec(text);
    while (match !== null) {
      const start = match.index + match[1].length;
      hits.push({ start, end: start + m.display.length, mention: m });
      match = re.exec(text);
    }
  });
  hits.sort((a, b) => a.start - b.start);

  const segments: MentionSegment[] = [];
  let cursor = 0;
  hits.forEach((hit) => {
    if (hit.start < cursor) return; // overlapping run already covered
    if (hit.start > cursor) segments.push({ text: text.slice(cursor, hit.start), mention: null });
    segments.push({ text: text.slice(hit.start, hit.end), mention: hit.mention });
    cursor = hit.end;
  });
  if (cursor < text.length) segments.push({ text: text.slice(cursor), mention: null });
  return segments;
}
