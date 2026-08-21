// Token-tag display envelope. A token stays `#SYMBOL`; an optional `{...}` suffix carries
// how the composer wants it displayed — `#SYMBOL{mode=advanced}`. The symbol is never
// touched, so nothing already on chain renders differently and the on-chain indexing
// contract is untouched. The envelope is permissive; the interpreter here is strict: a
// payload we do not understand resolves to the plain tag rather than rendering as text.

export interface TokenTagDisplayOptions {
  chart: boolean;
  price: boolean;
  change: boolean;
}

// Named presets are pure sugar over the three toggles, so there is one model, not two.
// `tag` carries `change: true` because `tag` means *today's rendering*, which already shows
// the change badge — dropping it would retroactively change every post on chain. The ladder
// is strictly monotonic: tag ⊂ compact ⊂ advanced. Turning the badge off is `{change=0}`.
const MODE_PRESETS: Record<string, TokenTagDisplayOptions> = {
  tag: { chart: false, price: false, change: true },
  compact: { chart: false, price: true, change: true },
  advanced: { chart: true, price: true, change: true },
};

const TAG_PRESET = MODE_PRESETS.tag;
const BOOLEAN_KEYS = ['chart', 'price', 'change'] as const;

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
    Object.assign(resolved, MODE_PRESETS[mode] ?? TAG_PRESET);
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

/**
 * Whether the resolved options need the richer widget. Only `chart`/`price` do — `change`
 * is the tag's own badge, rendered on the plain node and gated separately, so it must NOT be
 * part of this switch. Were it included, all-false `{change=0}` would be indistinguishable
 * from the default and the badge could never be turned off.
 */
export function isTokenTagEnhanced(options: TokenTagDisplayOptions): boolean {
  return options.chart || options.price;
}

// Strip token-tag envelopes from raw content, leaving the bare `#symbol`, so an envelope
// never reaches a meta description, a search snippet, or a link preview. The symbol class
// is deliberately broad (any Unicode letter/number/dash) to cover every collection
// alphabet; only the trailing `{...}` is removed, never the symbol itself.
const STRIP_REGEX_SOURCE = `(#[\\p{L}\\p{N}-]{1,50})\\{${TOKEN_TAG_ENVELOPE_PAYLOAD}\\}`;

export function stripTokenTagEnvelopes(content: string): string {
  return String(content ?? '').replace(new RegExp(STRIP_REGEX_SOURCE, 'gu'), '$1');
}
