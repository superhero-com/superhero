// Composer-side scan of the token-tag display envelope. A token stays `#SYMBOL`; the composer
// may append a `{...}` suffix describing how it should render — `#SYMBOL{mode=advanced}`. This
// is the WRITER half: it emits exactly what the reader consumes and re-reads its own output.
// The model (presets, parser, serializer) and the tag-scanning grammar are owned by the reader
// module (src/utils/tokenTagEnvelope.ts) and imported here, so there is one source of truth —
// this module keeps only the composer-side concerns: scanning the buffer and rewriting a tag.

import {
  MODE_PRESETS,
  parseTokenTagEnvelope,
  serializeTokenTagEnvelope,
  buildTokenNameRegex,
  walkHashtagRun,
  HASHTAG_WORD_REGEX_SOURCE,
  type TokenTagDisplayOptions,
} from '@/utils/tokenTagEnvelope';

export interface ScannedTokenTag {
  index: number; // ordinal among all token tags in the text
  symbol: string; // without the leading '#'
  start: number; // string offset of the '#'
  end: number; // string offset just past the whole match (symbol + envelope)
  payload: string; // envelope payload without braces, '' when absent
  hasEnvelope: boolean;
  options: TokenTagDisplayOptions;
}

// Every token tag in the composer text, in order, with its resolved display options. Uses the
// reader's run-walk (`walkHashtagRun`) so a chip surfaces for exactly the tags the reader will
// interpret — including both halves of an unseparated pair like "#one#two". `allowedCharsPattern`
// is the live collection alphabet from useHashtagAllowedChars(); pass it so the scan honours the
// same symbol class the reader does.
export function scanTokenTags(text: string, allowedCharsPattern?: string): ScannedTokenTag[] {
  const source = String(text ?? '');
  const runRegex = new RegExp(HASHTAG_WORD_REGEX_SOURCE, 'g'); // fresh: `g` is stateful
  const tokenNameRegex = buildTokenNameRegex(allowedCharsPattern);
  const out: ScannedTokenTag[] = [];
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = runRegex.exec(source)) !== null) {
    const lead = match[1] ?? ''; // guard char before '#', consumed by the match but not the tag
    const runStart = match.index + lead.length; // string offset of the '#'
    const segments = walkHashtagRun(`#${match[2]}`, tokenNameRegex);
    // A run can hold several tags ("#one#two"); each keeps its ordinal via `out.length`.
    for (let s = 0; segments && s < segments.length; s += 1) {
      const seg = segments[s];
      if (seg.type === 'tag') {
        out.push({
          index: out.length,
          symbol: seg.symbol,
          start: runStart + seg.start,
          end: runStart + seg.end,
          payload: seg.payload,
          hasEnvelope: seg.hasEnvelope,
          options: seg.hasEnvelope ? parseTokenTagEnvelope(seg.payload) : { ...MODE_PRESETS.tag },
        });
      }
    }
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
