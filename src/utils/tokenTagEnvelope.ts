// Token-tag display envelope. A token stays `#SYMBOL`; an optional `{...}` suffix carries
// how the composer wants it displayed — `#SYMBOL{mode=advanced}`. The symbol is never
// touched, so nothing already on chain renders differently and the on-chain indexing
// contract is untouched. The envelope is permissive; the interpreter here is strict: a
// payload we do not understand resolves to the plain tag rather than rendering as text.
//
// This is the canonical home for the whole model: the reader (`utils/linkify`) and the
// composer/writer (`features/social/utils/tokenTagOptions`) both import from here, so the
// preset table, the parser/serializer, and the tag-scanning grammar have one source of
// truth rather than a mirror that can drift out of step.

export interface TokenTagDisplayOptions {
  chart: boolean;
  price: boolean;
  change: boolean;
}

export type TokenTagMode = 'tag' | 'compact' | 'advanced';

// Named presets are pure sugar over the three toggles, so there is one model, not two.
// `tag` carries `change: true` because `tag` means *today's rendering*, which already shows
// the change badge — dropping it would retroactively change every post on chain. The ladder
// is strictly monotonic: tag ⊂ compact ⊂ advanced. Turning the badge off is `{change=0}`.
export const MODE_PRESETS: Record<TokenTagMode, TokenTagDisplayOptions> = {
  tag: { chart: false, price: false, change: true },
  compact: { chart: false, price: true, change: true },
  advanced: { chart: true, price: true, change: true },
};

export const MODE_ORDER: TokenTagMode[] = ['tag', 'compact', 'advanced'];
const TAG_PRESET = MODE_PRESETS.tag;
const BOOLEAN_KEYS = ['chart', 'price', 'change'] as const;

export const DEFAULT_TOKEN_TAG_OPTIONS: TokenTagDisplayOptions = { ...TAG_PRESET };

// The envelope payload following a token symbol: at most 64 chars, no braces or newlines.
// Kept here so the reader and the SEO strippers share one grammar.
export const TOKEN_TAG_ENVELOPE_PAYLOAD = '[^{}\\r\\n]{0,64}';

/**
 * Resolve a raw envelope payload into display options. Degradation is total and in this
 * order: an empty, unparseable, or entirely-unknown payload resolves to the `tag` preset;
 * an unknown `mode` value falls back to `tag` while known keys still apply; an unknown key
 * or an unrecognised value drops that pair only. The caller always renders the symbol.
 */
export function parseTokenTagEnvelope(payload: string): TokenTagDisplayOptions {
  const resolved: TokenTagDisplayOptions = { ...TAG_PRESET };
  const pairs = String(payload ?? '')
    .toLowerCase()
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean);

  // `mode` first, so explicit toggles override its preset regardless of their order.
  const modePair = pairs.find((pair) => pair.startsWith('mode='));
  if (modePair) {
    const mode = modePair.slice('mode='.length);
    Object.assign(resolved, MODE_PRESETS[mode as TokenTagMode] ?? TAG_PRESET);
  }

  pairs.forEach((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) return; // bare flag / garbage: no `key=value`, drop it
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (key === 'mode') return; // handled above
    if ((BOOLEAN_KEYS as readonly string[]).includes(key)) {
      if (value === '1') resolved[key as (typeof BOOLEAN_KEYS)[number]] = true;
      else if (value === '0') resolved[key as (typeof BOOLEAN_KEYS)[number]] = false;
      // any other value: drop this pair only
    }
    // unknown key: drop
  });

  return resolved;
}

function optionsEqual(a: TokenTagDisplayOptions, b: TokenTagDisplayOptions): boolean {
  return a.chart === b.chart && a.price === b.price && a.change === b.change;
}

// The named preset a set of options exactly matches, or null for a custom mix.
export function matchPreset(options: TokenTagDisplayOptions): TokenTagMode | null {
  return MODE_ORDER.find((mode) => optionsEqual(MODE_PRESETS[mode], options)) ?? null;
}

/**
 * Emit the shortest envelope that resolves back to `options` under `parseTokenTagEnvelope`.
 * The `tag` default returns '' — a bare `#SYMBOL`, byte-identical to today — so nothing
 * already on chain and no untouched tag changes shape. Compact/advanced use the named
 * `mode`; a custom mix picks whichever base (the default `tag`, or a named preset) needs the
 * fewest override pairs, preferring the shorter no-`mode` form on ties.
 */
export function serializeTokenTagEnvelope(options: TokenTagDisplayOptions): string {
  const preset = matchPreset(options);
  if (preset === 'tag') return '';
  if (preset) return `{mode=${preset}}`;

  const candidates: { mode: TokenTagMode | null; base: TokenTagDisplayOptions }[] = [
    { mode: null, base: MODE_PRESETS.tag }, // `tag` is the default → no `mode=` token
    { mode: 'compact', base: MODE_PRESETS.compact },
    { mode: 'advanced', base: MODE_PRESETS.advanced },
  ];

  let best: string[] | null = null;
  candidates.forEach((candidate) => {
    const overrides = BOOLEAN_KEYS
      .filter((key) => options[key] !== candidate.base[key])
      .map((key) => `${key}=${options[key] ? '1' : '0'}`);
    const tokens = candidate.mode ? [`mode=${candidate.mode}`, ...overrides] : overrides;
    if (best === null || tokens.length < best.length) best = tokens;
  });

  return `{${(best as unknown as string[]).join(';')}}`;
}

/**
 * Whether the resolved options need the richer widget. Only `chart`/`price` do — `change`
 * is the tag's own badge, rendered on the plain node and gated separately, so it must NOT be
 * part of this switch. Were it included, all-false `{change=0}` would be indistinguishable
 * from the default and the badge could never be turned off.
 */
export function isTokenTagEnhanced(options: TokenTagDisplayOptions): boolean {
  return options.chart || options.price;
}

// --- Tag-scanning grammar, shared by the reader (`linkify`) and the composer scan ---
// One source of truth for the lead-character guard, the symbol class, and the envelope
// matcher, so a chip surfaces for exactly the tags the reader will interpret — and no others.
// Two copies of this grammar was a measured drift surface; keep it single here.

// The token-name character class when no live collection data is available: letters, numbers,
// dashes. The live collection alphabet (from `useHashtagAllowedChars()`) is appended to it.
export const DEFAULT_TOKEN_NAME_CHARS = 'A-Za-z0-9\\-';

// A hashtag "word": '#' at the start of the text, or anywhere NOT immediately preceded by a
// domain/path-forming character (word char, '.', or '/'), followed by the full run of
// non-whitespace characters. The lead guard protects URL fragments like
// "example.com/page#section" without requiring whitespace before every hashtag. The whole run
// is then walked char-by-char (see `walkHashtagRun`), so an unseparated pair like "#one#two"
// links both. Compile a fresh instance per consumer — the `g` flag is stateful.
export const HASHTAG_WORD_REGEX_SOURCE = '(^|[^\\w./])#(\\S+)';

// The `{payload}` display envelope directly after a symbol, anchored to the symbol's end.
export const TOKEN_TAG_ENVELOPE_REGEX_SOURCE = `^\\{(${TOKEN_TAG_ENVELOPE_PAYLOAD})\\}`;

const TOKEN_TAG_ENVELOPE_REGEX = new RegExp(TOKEN_TAG_ENVELOPE_REGEX_SOURCE);

// The valid-name prefix of a hashtag word: anchored, non-global, `u` so the {1,50} cap and the
// class count by Unicode code point (multi-byte collection alphabets) rather than UTF-16 unit.
export function buildTokenNameRegex(allowedCharsPattern?: string): RegExp {
  const charClass = allowedCharsPattern
    ? `${DEFAULT_TOKEN_NAME_CHARS}${allowedCharsPattern}`
    : DEFAULT_TOKEN_NAME_CHARS;
  return new RegExp(`^[${charClass}]{1,50}`, 'u');
}

// One segment of a walked hashtag run: a resolved token tag, or an inert stretch that is not a
// valid token start (kept as plain text by the caller). Offsets are relative to the run start.
export type TokenTagRunSegment =
  | {
    type: 'tag';
    symbol: string;
    start: number; // offset of the '#' within the run
    end: number; // offset just past the symbol + optional envelope
    payload: string; // envelope payload without braces, '' when absent
    hasEnvelope: boolean;
  }
  | { type: 'inert'; text: string; start: number };

/**
 * Walk one hashtag "word" run — the `#`+non-whitespace run matched by `HASHTAG_WORD_REGEX` —
 * splitting it into token-tag matches and the inert stretches between them. A single run can
 * hold more than one tag with no separator ("#one#two", "##foo"), and characters that are not
 * part of a valid token (e.g. ".ai/") are inert until the next '#', so parsing resumes there.
 * `tokenNameRegex` is a `buildTokenNameRegex(...)` instance (anchored, non-global). Returns
 * null when no '#' in the run ever led to a valid token, so the caller leaves it untouched.
 */
export function walkHashtagRun(
  run: string,
  tokenNameRegex: RegExp,
): TokenTagRunSegment[] | null {
  const segments: TokenTagRunSegment[] = [];
  let i = 0;
  let matchedAny = false;
  while (i < run.length) {
    const tokenMatch = run[i] === '#' ? run.slice(i + 1).match(tokenNameRegex) : null;
    if (tokenMatch) {
      const symbol = tokenMatch[0];
      const symEnd = i + 1 + symbol.length;
      // A `{payload}` directly after the symbol is a display envelope. It is always consumed
      // so its text never renders; an unterminated or invalid brace is not an envelope.
      const envMatch = run[symEnd] === '{' ? run.slice(symEnd).match(TOKEN_TAG_ENVELOPE_REGEX) : null;
      const end = envMatch ? symEnd + envMatch[0].length : symEnd;
      segments.push({
        type: 'tag',
        symbol,
        start: i,
        end,
        payload: envMatch ? envMatch[1] : '',
        hasEnvelope: Boolean(envMatch),
      });
      i = end;
      matchedAny = true;
    } else {
      // Inert stretch: not a valid token start. Consume up to (not including) the next '#' so
      // the loop can retry hashtag parsing from there.
      let j = i + 1;
      while (j < run.length && run[j] !== '#') j += 1;
      segments.push({ type: 'inert', text: run.slice(i, j), start: i });
      i = j;
    }
  }
  return matchedAny ? segments : null;
}

// Strip token-tag envelopes from raw content, leaving the bare `#symbol`, so an envelope
// never reaches a meta description, a search snippet, or a link preview. The symbol class
// is deliberately broad (any Unicode letter/number/dash) to cover every collection
// alphabet; only the trailing `{...}` is removed, never the symbol itself.
const STRIP_REGEX_SOURCE = `(#[\\p{L}\\p{N}-]{1,50})\\{${TOKEN_TAG_ENVELOPE_PAYLOAD}\\}`;

export function stripTokenTagEnvelopes(content: string): string {
  return String(content ?? '').replace(new RegExp(STRIP_REGEX_SOURCE, 'gu'), '$1');
}
