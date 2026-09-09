/**
 * Scheme allowlist for any `href`/`window.open` target built from remote or
 * user-controlled data (og:url scraped from a linked page, a DAO/governance
 * poll's free-text `metadata.link`, etc.).
 *
 * React does **not** sanitize `href` — an attacker who controls the string
 * (e.g. the `og:url` meta tag on a page they own, or a poll's metadata they
 * authored) can hand us `javascript:...`, `data:text/html,...`, `vbscript:...`,
 * or a case/whitespace-obfuscated variant of any of those, and get 1-click
 * script execution in the Superhero origin the moment the link is clicked —
 * a same-origin wallet seed-drain primitive.
 *
 * `safeHref` is the single choke point every such sink must go through: it
 * parses the candidate URL and only returns it back out if the resolved
 * scheme is on the allowlist (http/https, plus mailto if a caller opts in).
 * Anything else — including things a naive `startsWith('javascript:')` check
 * would miss, like leading/embedded whitespace or control characters, mixed
 * case, or a URL that only *resolves* to a bad scheme after the browser's own
 * parsing/whitespace-stripping rules — resolves to `undefined`.
 */

const DEFAULT_ALLOWED_SCHEMES = ['http:', 'https:'] as const;

export interface SafeHrefOptions {
  /** Additional schemes to allow beyond http:/https: (e.g. ['mailto:']). */
  allowSchemes?: string[];
}

/**
 * Strips characters the WHATWG URL parser (and browsers generally) treat as
 * insignificant *inside* a URL before computing the scheme — ASCII tabs and
 * newlines are removed wherever they appear (not just at the ends), which is
 * exactly how browsers defeat naive `javascript:` string-prefix filters via
 * payloads like `java\tscript:alert(1)` or `java\nscript:alert(1)`.
 */
function stripUrlWhitespace(input: string): string {
  return input.replace(/[\t\n\r]/g, '');
}

/**
 * Validates `candidate` and returns it unchanged if (and only if) it resolves
 * to an allowed scheme; otherwise returns `undefined` so callers can fall
 * back to a safe default (e.g. `#`, or omit the `href` entirely).
 *
 * Relative URLs (`/path`, `./path`, `#frag`) are always allowed — they can
 * only ever resolve to same-origin http(s), never to a dangerous scheme.
 *
 * @param candidate the raw, possibly attacker-controlled URL string
 * @param options.allowSchemes extra schemes to allow (e.g. `['mailto:']`)
 */
export function safeHref(
  candidate: string | null | undefined,
  options?: SafeHrefOptions,
): string | undefined {
  if (candidate == null) return undefined;

  const trimmed = stripUrlWhitespace(String(candidate)).trim();
  if (!trimmed) return undefined;

  const allowed = new Set<string>([
    ...DEFAULT_ALLOWED_SCHEMES,
    ...(options?.allowSchemes ?? []).map((s) => s.toLowerCase()),
  ]);

  // Relative URLs (no scheme at all — "/foo", "./foo", "#foo", "foo/bar")
  // can only ever resolve same-origin over the page's own (http/https)
  // scheme, so they're safe to pass through untouched without a base URL.
  // A leading "//" is scheme-relative and DOES carry attacker-controlled
  // authority, but never an attacker-controlled *scheme*, so it's likewise
  // not a `javascript:`/`data:`-style injection vector — leave it be.
  if (/^[/.#?]/.test(trimmed)) return trimmed;

  // Absolute-URL candidates must resolve (via the real WHATWG URL parser —
  // the same engine the browser itself uses) to an allowed scheme. Using
  // `new URL()` instead of a regex/`startsWith` check means we inherit the
  // browser's own scheme-detection quirks (case-insensitivity, embedded
  // control characters already stripped above, etc.) rather than trying to
  // out-guess them.
  try {
    const parsed = new URL(trimmed);
    if (allowed.has(parsed.protocol.toLowerCase())) {
      return trimmed;
    }
    return undefined;
  } catch {
    // Not parseable as an absolute URL and doesn't start with a relative-URL
    // marker either (e.g. "javascript:alert(1)" itself, or "bare-text") —
    // `new URL()` *does* successfully parse "javascript:alert(1)" (protocol
    // "javascript:"), so this branch is reserved for genuinely malformed
    // input. Treat it as unsafe rather than guessing.
    return undefined;
  }
}

/** `true` if `candidate` resolves to an allowed (http/https/…) scheme. */
export function isSafeHref(
  candidate: string | null | undefined,
  options?: SafeHrefOptions,
): boolean {
  return safeHref(candidate, options) !== undefined;
}
