/* Strip a token-tag display envelope (`#SYMBOL{mode=advanced}` -> `#SYMBOL`) so it never lands
 * in a meta description, snippet, or link preview served by the SSR head injector.
 *
 * Split out of index.cjs so the SSR copy is testable on its own: index.cjs reads dist/index.html
 * and binds a port at require time, so it cannot be imported by a unit test. The grammar mirrors
 * the client reader in src/utils/tokenTagEnvelope.ts — the payload class `[^{}\r\n]{0,64}` admits
 * internal whitespace on purpose (`{change = 0}`), so the reader and this stripper must both drop
 * a spaced envelope rather than one interpreting it and the other leaking the raw braces.
 */

const TOKEN_TAG_ENVELOPE_RE = /(#[\p{L}\p{N}-]{1,50})\{[^{}\r\n]{0,64}\}/gu;

function stripTokenTagEnvelopes(s) {
  return String(s || '').replace(TOKEN_TAG_ENVELOPE_RE, '$1');
}

module.exports = { stripTokenTagEnvelopes };
