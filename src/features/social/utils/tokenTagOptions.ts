// Composer-side model for the token-tag display envelope. A token stays `#SYMBOL`; the
// composer may append a `{...}` suffix describing how it should render — `#SYMBOL{mode=advanced}`.
// This is the WRITER half: it emits exactly what the reader consumes and re-reads its own
// output. The reader owns the canonical parser (src/utils/tokenTagEnvelope.ts); this module
// mirrors the same preset table so the composer stays self-contained rather than importing a
// module that ships on a separate, earlier-merging branch.

export interface TokenTagDisplayOptions {
  chart: boolean;
  price: boolean;
  change: boolean;
}

export type TokenTagMode = 'tag' | 'compact' | 'advanced';

// Presets are sugar over the three toggles, so there is one model, not two. `tag` keeps
// `change: true` because it means *today's rendering*, which already shows the 24h change
// badge — dropping it would retroactively change every post on chain. The badge-less "just
// the symbol" form is `{change=0}`, not `{mode=tag}`. Ladder is monotonic: tag ⊂ compact ⊂ adv.
export const MODE_PRESETS: Record<TokenTagMode, TokenTagDisplayOptions> = {
  tag: { chart: false, price: false, change: true },
  compact: { chart: false, price: true, change: true },
  advanced: { chart: true, price: true, change: true },
};

export const MODE_ORDER: TokenTagMode[] = ['tag', 'compact', 'advanced'];
const TAG_PRESET = MODE_PRESETS.tag;
const BOOLEAN_KEYS = ['chart', 'price', 'change'] as const;

export const DEFAULT_TOKEN_TAG_OPTIONS: TokenTagDisplayOptions = { ...TAG_PRESET };

function optionsEqual(a: TokenTagDisplayOptions, b: TokenTagDisplayOptions): boolean {
  return a.chart === b.chart && a.price === b.price && a.change === b.change;
}

// The named preset a set of options exactly matches, or null for a custom mix.
export function matchPreset(options: TokenTagDisplayOptions): TokenTagMode | null {
  return MODE_ORDER.find((mode) => optionsEqual(MODE_PRESETS[mode], options)) ?? null;
}

/**
 * Resolve a raw envelope payload into display options, mirroring the reader contract exactly:
 * an empty or entirely-unknown payload resolves to the `tag` preset; `mode` applies first so
 * explicit toggles override it; an unknown key or unrecognised value drops that pair only.
 * Kept in step with parseTokenTagEnvelope in src/utils/tokenTagEnvelope.ts.
 */
export function parseTokenTagEnvelope(payload: string): TokenTagDisplayOptions {
  const resolved: TokenTagDisplayOptions = { ...TAG_PRESET };
  const pairs = String(payload ?? '')
    .toLowerCase()
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean);

  const modePair = pairs.find((pair) => pair.startsWith('mode='));
  if (modePair) {
    const mode = modePair.slice('mode='.length);
    Object.assign(resolved, MODE_PRESETS[mode as TokenTagMode] ?? TAG_PRESET);
  }

  pairs.forEach((pair) => {
    const eq = pair.indexOf('=');
    if (eq < 0) return; // bare flag / garbage: no `key=value`
    const key = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    if (key === 'mode') return; // handled above
    if ((BOOLEAN_KEYS as readonly string[]).includes(key)) {
      if (value === '1') resolved[key as (typeof BOOLEAN_KEYS)[number]] = true;
      else if (value === '0') resolved[key as (typeof BOOLEAN_KEYS)[number]] = false;
    }
  });

  return resolved;
}

/**
 * Emit the shortest envelope that resolves back to `options` under the reader contract. The
 * `tag` default returns '' — a bare `#SYMBOL`, byte-identical to today — so nothing already
 * on chain and no untouched tag changes shape. Compact/advanced use the named `mode`; a
 * custom mix picks whichever base (the default `tag`, or a named preset) needs the fewest
 * override pairs, preferring the shorter no-`mode` form on ties.
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

// The token-name character class when no live collection data is available, byte-identical to
// the reader's DEFAULT_HASHTAG_CHARS_PATTERN in src/utils/linkify.tsx: letters, numbers, dashes.
const DEFAULT_TOKEN_NAME_CHARS = 'A-Za-z0-9\\-';

// Matches a token tag and its optional display envelope, mirroring the reader's grammar so a chip
// surfaces for exactly the tokens the reader will interpret — and, critically, for no others:
//   - the `(^|[^\w./])#` lead guard refuses a '#' preceded by a word char, '.' or '/', so a URL
//     fragment such as "example.com/page#section" is left alone (matches HASHTAG_WORD_REGEX);
//   - the symbol class is `A-Za-z0-9-` plus the live collection alphabet (`allowedCharsPattern`
//     from useHashtagAllowedChars()), not a blanket \p{L}\p{N}, so it honours the same names the
//     reader does rather than offering chips on characters the loaded collections reject.
// The lead char is captured (group 1) rather than a lookbehind so the two grammars read the same.
// Fresh instance per call — `g` is stateful.
export function createTokenTagRegex(allowedCharsPattern?: string): RegExp {
  const charClass = allowedCharsPattern
    ? `${DEFAULT_TOKEN_NAME_CHARS}${allowedCharsPattern}`
    : DEFAULT_TOKEN_NAME_CHARS;
  return new RegExp(`(^|[^\\w./])#([${charClass}]{1,50})(\\{[^{}\\r\\n]{0,64}\\})?`, 'gu');
}

export interface ScannedTokenTag {
  index: number; // ordinal among all token tags in the text
  symbol: string; // without the leading '#'
  start: number; // string offset of the '#'
  end: number; // string offset just past the whole match (symbol + envelope)
  payload: string; // envelope payload without braces, '' when absent
  hasEnvelope: boolean;
  options: TokenTagDisplayOptions;
}

// Every token tag in the composer text, in order, with its resolved display options.
// `allowedCharsPattern` is the live collection alphabet from useHashtagAllowedChars(); pass it so
// the scan honours the same symbol class the reader does.
export function scanTokenTags(text: string, allowedCharsPattern?: string): ScannedTokenTag[] {
  const regex = createTokenTagRegex(allowedCharsPattern);
  const out: ScannedTokenTag[] = [];
  let match: RegExpExecArray | null;
  let index = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = regex.exec(String(text ?? ''))) !== null) {
    const lead = match[1] ?? ''; // guard char before '#', consumed by the match but not the tag
    const braces = match[3] ?? '';
    const payload = braces ? braces.slice(1, -1) : '';
    const start = match.index + lead.length;
    out.push({
      index,
      symbol: match[2],
      start,
      end: match.index + match[0].length,
      payload,
      hasEnvelope: Boolean(braces),
      options: braces ? parseTokenTagEnvelope(payload) : { ...TAG_PRESET },
    });
    index += 1;
  }
  return out;
}

/**
 * Replace the envelope on the Nth token tag with the serialization of `options`, editing the
 * composer string in place — the composer format IS the posted format, one buffer. The symbol
 * itself is never touched, so the on-chain indexing contract is untouched. Returns the text
 * unchanged if no tag sits at that ordinal (e.g. it was deleted while the popover was open).
 */
export function applyTokenTagOptions(
  text: string,
  ordinal: number,
  options: TokenTagDisplayOptions,
  allowedCharsPattern?: string,
): string {
  const tag = scanTokenTags(text, allowedCharsPattern).find((entry) => entry.index === ordinal);
  if (!tag) return text;
  const envelope = serializeTokenTagEnvelope(options);
  return `${text.slice(0, tag.start)}#${tag.symbol}${envelope}${text.slice(tag.end)}`;
}
