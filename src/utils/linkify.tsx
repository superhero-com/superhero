/* eslint-disable
  no-useless-escape,
  max-len,
  react/no-array-index-key,
  no-use-before-define,
  react/no-invalid-html-attribute,
  no-shadow,
  no-plusplus
*/
import React from 'react';
import { Link } from 'react-router-dom';
import PostHashtagLink, { type TrendMention } from '@/components/social/PostHashtagLink';
import { InlineAccountMention } from '@/components/social/InlineAccountMention';
import PostTokenTag from '@/components/social/PostTokenTag';
import {
  parseTokenTagEnvelope,
  isTokenTagEnhanced,
  TOKEN_TAG_ENVELOPE_PAYLOAD,
} from '@/utils/tokenTagEnvelope';
import { trustedHtml } from '@/utils/trustedTypes';
import { formatAddress } from './address';

// The `{payload}` display envelope immediately following a token symbol. Anchored so it
// only matches directly after the symbol; the symbol itself is matched by the existing
// hashtag classes above. A present-but-invalid envelope is still consumed (never printed).
const TOKEN_TAG_ENVELOPE_REGEX = new RegExp(`^\\{(${TOKEN_TAG_ENVELOPE_PAYLOAD})\\}`);

// URL matcher (external links)
const URL_REGEX = /((https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]*)?)/gi;
// Optional '@' followed by an AENS name ending with .chain (word boundary to avoid trailing '/')
const AENS_TAG_REGEX = /@?[a-z0-9-]+\.chain\b/gi;
// Optional '@' followed by an account address starting with ak_
const ACCOUNT_TAG_REGEX = /@?(ak_[A-Za-z0-9]+)/gi;
// Explicit deliberate account mention: `[account:ak_...]`. The `]` terminator bounds
// the token; base58 is case-sensitive (no `i` flag); the macro cannot occur by accident.
const ACCOUNT_MACRO_REGEX = /\[account:(ak_[1-9A-HJ-NP-Za-km-z]{48,56})\]/g;
// A hashtag "word": '#' at the start of the text, or anywhere NOT immediately preceded by a
// domain/path-forming character (word char, '.', or '/'), followed by the full run of
// non-whitespace characters. The exclusion specifically protects URL fragments like
// "example.com/page#section" (preceded by 'e', a word char) without requiring whitespace before
// every hashtag — CJK text, punctuation, and other non-Latin scripts commonly butt right up
// against a following "#tag" with no space (e.g. "支持#你好", "see,#TOKEN").
const HASHTAG_WORD_REGEX = /(^|[^\w./])#(\S+)/g;
// Fallback token-name character class when no live collection data is available (e.g. before
// the BCL factory schema has loaded): letters, numbers, and dashes only.
const DEFAULT_HASHTAG_CHARS_PATTERN = 'A-Za-z0-9\\-';
// Regexes are rebuilt per distinct `hashtagAllowedChars` pattern (collections load once and
// rarely change), so a tiny cache avoids recompiling the same regex on every render.
const hashtagTokenRegexCache = new Map<string, RegExp>();
function getHashtagTokenRegex(extraCharsPattern?: string): RegExp {
  const pattern = extraCharsPattern
    ? `${DEFAULT_HASHTAG_CHARS_PATTERN}${extraCharsPattern}`
    : DEFAULT_HASHTAG_CHARS_PATTERN;
  let regex = hashtagTokenRegexCache.get(pattern);
  if (!regex) {
    // The token-name-valid prefix of a hashtag word. Notably excludes '.', so "#emoter.ai"
    // only captures "emoter" as the token name — anything after the valid prefix (e.g. ".ai")
    // is not a valid token and is left as plain, inert text. The 'u' flag makes the {1,50}
    // length cap and the character class count by Unicode code point, not UTF-16 code unit,
    // so multi-byte collection alphabets (Chinese, Arabic, Russian, ...) are handled correctly.
    regex = new RegExp(`^[${pattern}]{1,50}`, 'u');
    hashtagTokenRegexCache.set(pattern, regex);
  }
  return regex;
}

export function linkify(
  text: string,
  options?: {
    knownChainNames?: Set<string>;
    hashtagVariant?: 'post-inline';
    trendMentions?: TrendMention[];
    /**
     * Regex character-class body (e.g. from `mergedCollectionNameCharsPattern`) covering the
     * name characters allowed by every known BCL token collection, in addition to the default
     * A-Z/0-9/'-'. Pass this so hashtag detection for non-Latin collections (Chinese, Arabic,
     * Russian, and any collection added later) stays in sync with the live factory schema
     * without requiring changes here.
     */
    hashtagAllowedChars?: string;
  },
): React.ReactNode[] {
  if (!text) return [];
  let raw = String(text);
  const hashtagTokenRegex = getHashtagTokenRegex(options?.hashtagAllowedChars);

  // Decode HTML entities first (in case content is HTML-encoded)
  // Use a safe method that works in both browser and SSR contexts
  const decodeHtmlEntities = (str: string): string => {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = trustedHtml(str);
      return textarea.value;
    }
    // Fallback for SSR: decode common entities manually
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#10;|&#xA;|&#x0A;/gi, '\n');
  };
  raw = decodeHtmlEntities(raw);

  // Handle various newline representations and convert them to actual newlines
  // This handles cases where content is stored with escaped or encoded newline characters
  // Process in order from most specific to least specific

  // 1. Double-escaped: \\\\n -> \n (handle double escaping first)
  raw = raw.replace(/\\\\n/g, '\n');
  // 2. Escaped newlines: \\n -> \n
  raw = raw.replace(/\\n/g, '\n');
  // 3. HTML entity newlines: &#10; or &#xA; or &#x0A; -> \n (in case decodeHtmlEntities didn't catch them)
  raw = raw.replace(/&#10;|&#xA;|&#x0A;/gi, '\n');
  // 4. Carriage return + newline: \r\n -> \n
  raw = raw.replace(/\r\n/g, '\n');
  // 5. Carriage return alone: \r -> \n
  raw = raw.replace(/\r/g, '\n');

  // Renders a single '#token' as a link, per the `hashtagVariant` option. `keyPos` is the
  // absolute offset of the '#' in `raw`, used to keep React keys unique across the whole text.
  // `showChange` gates the inline change badge — true for a bare tag (today's rendering) and
  // for the `tag` preset, false for an explicit `{change=0}`.
  const renderHashtagNode = (
    tokenName: string,
    keyPos: number,
    showChange = true,
  ): React.ReactNode => (
    options?.hashtagVariant === 'post-inline' ? (
      <PostHashtagLink
        tag={tokenName}
        label={`#${tokenName}`}
        trendMentions={options?.trendMentions}
        variant="inline"
        showChange={showChange}
        key={`hashtag-${tokenName}-${keyPos}`}
      />
    ) : (
      <Link
        to={`/trends/tokens/${encodeURIComponent(tokenName.toUpperCase())}`}
        key={`hashtag-${tokenName}-${keyPos}`}
        className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
        onClick={(e) => e.stopPropagation()}
      >
        {`#${tokenName}`}
      </Link>
    )
  );

  // Pass 0: Hashtags → router link to trending tokens page (/trends/tokens/<UPPERCASE>).
  // Runs first (on the raw text) so that a hashtag's invalid trailing characters (e.g. the
  // ".ai/" in "#emoter.ai/") are consumed here and marked inert, before the AENS/account/URL
  // passes below get a chance to mistake them for a domain, chain name, or account mention.
  //
  // A single non-whitespace run can contain more than one hashtag with no separator between
  // them (e.g. "#one#two", or a stray "##foo"), so the whole run (including the leading '#'
  // that HASHTAG_WORD_REGEX matched separately) is walked char-by-char: each '#' followed by
  // valid token characters becomes its own link, and any characters that aren't part of a
  // valid token (e.g. ".ai/", or a '#' not followed by a valid token) are left as inert plain
  // text until the next '#' is found, so parsing can resume from there.
  const hashtagLinked: React.ReactNode[] = [];
  let hLast = 0;
  raw.replace(HASHTAG_WORD_REGEX, (m: string, lead: string, word: string, offset: number) => {
    const hashStart = offset + lead.length;
    const fullRun = `#${word}`;
    let i = 0;
    let matchedAny = false;
    const nodes: React.ReactNode[] = [];
    while (i < fullRun.length) {
      const tokenMatch = fullRun[i] === '#'
        ? fullRun.slice(i + 1).match(hashtagTokenRegex)
        : null;
      if (tokenMatch) {
        const symbol = tokenMatch[0];
        const symEnd = i + 1 + symbol.length;
        // A `{payload}` directly after the symbol is a display envelope. It is always
        // consumed so its text never renders; an enhanced option set becomes a widget,
        // and an absent/empty/unrecognised envelope falls back to the plain tag.
        const envMatch = fullRun[symEnd] === '{'
          ? fullRun.slice(symEnd).match(TOKEN_TAG_ENVELOPE_REGEX)
          : null;
        if (envMatch) {
          const tagOptions = parseTokenTagEnvelope(envMatch[1]);
          nodes.push(
            isTokenTagEnhanced(tagOptions) ? (
              <PostTokenTag
                symbol={symbol}
                options={tagOptions}
                variant={options?.hashtagVariant === 'post-inline' ? 'inline' : 'pill'}
                key={`token-tag-${symbol}-${hashStart + i}`}
              />
            ) : (
              // Not a widget: render today's tag, but honour an explicit `{change=0}` by
              // gating the badge on the resolved `change` option (default `tag` keeps it on).
              renderHashtagNode(symbol, hashStart + i, tagOptions.change)
            ),
          );
          i = symEnd + envMatch[0].length;
        } else {
          nodes.push(renderHashtagNode(symbol, hashStart + i));
          i = symEnd;
        }
        matchedAny = true;
      } else {
        // Inert stretch: not a valid token start. Consume up to (not including) the next '#'
        // so the loop can retry hashtag parsing from there.
        let j = i + 1;
        while (j < fullRun.length && fullRun[j] !== '#') j++;
        const inertChunk = fullRun.slice(i, j);
        // Wrapped so later passes (which skip non-string nodes) don't try to re-linkify it
        // as a URL/AENS/account.
        nodes.push(<React.Fragment key={`hashtag-rest-${hashStart + i}`}>{inertChunk}</React.Fragment>);
        i = j;
      }
    }

    if (!matchedAny) {
      // No '#' in this run ever led to a valid token — not a hashtag, leave untouched for
      // later passes to evaluate normally.
      return m;
    }

    if (hashStart > hLast) hashtagLinked.push(raw.slice(hLast, hashStart));
    hashtagLinked.push(...nodes);
    hLast = offset + m.length;
    return m;
  });
  if (hLast < raw.length) hashtagLinked.push(raw.slice(hLast));

  // Pass 0.5: Explicit `[account:ak_...]` macros → inline account chip. Runs before the
  // AENS/account/URL passes so the address inside the macro is not re-processed, and is the
  // only account form that renders a chip; raw `ak_` addresses stay plain links (Pass 2a).
  const macroLinked: React.ReactNode[] = [];
  hashtagLinked.forEach((node, nodeIdx) => {
    if (typeof node !== 'string') {
      macroLinked.push(node);
      return;
    }
    const segment = node as string;
    let last = 0;
    segment.replace(ACCOUNT_MACRO_REGEX, (m: string, addr: string, offset: number) => {
      if (offset > last) macroLinked.push(segment.slice(last, offset));
      macroLinked.push(
        <InlineAccountMention address={addr} key={`acc-macro-${addr}-${nodeIdx}-${offset}`} />,
      );
      last = offset + m.length;
      return m;
    });
    if (last < segment.length) macroLinked.push(segment.slice(last));
  });

  // Pass 1: Identify AENS mentions and turn them into profile links
  const aensLinked: React.ReactNode[] = [];
  macroLinked.forEach((node, nodeIdx) => {
    if (typeof node !== 'string') {
      aensLinked.push(node);
      return;
    }
    const segment = node as string;
    let last = 0;
    segment.replace(AENS_TAG_REGEX, (match: string, offset: number) => {
      if (offset > last) aensLinked.push(segment.slice(last, offset));
      const name = match.startsWith('@') ? match.slice(1) : match; // strip optional '@'
      const normalized = name.toLowerCase();
      const isKnown = options?.knownChainNames?.has(normalized) ?? false;
      if (isKnown) {
        aensLinked.push(
          <a
            href={`/users/${name}`}
            key={`aens-${name}-${nodeIdx}-${offset}`}
            className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
          >
            {match}
          </a>,
        );
      } else {
        // Unknown name → keep as plain text
        aensLinked.push(match);
      }
      last = offset + match.length;
      return match;
    });
    if (last < segment.length) aensLinked.push(segment.slice(last));
  });

  // Pass 2a: Within remaining plain text segments, convert ak_ address mentions
  const accountLinked: React.ReactNode[] = [];
  aensLinked.forEach((node, idx) => {
    if (typeof node !== 'string') {
      accountLinked.push(node);
      return;
    }
    const segment = node as string;
    let segLast = 0;
    segment.replace(ACCOUNT_TAG_REGEX, (m: string, addr: string, off: number) => {
      if (off > segLast) accountLinked.push(segment.slice(segLast, off));
      const address = addr; // captured address without leading '@'
      // A raw address (with or without '@') is a plain profile link — a deliberate
      // mention is the `[account:...]` macro handled in Pass 0.5, not a bare address.
      const displayCore = formatAddress(address);
      const display = m.startsWith('@') ? `@${displayCore}` : displayCore;
      accountLinked.push(
        <a
          href={`/users/${address}`}
          key={`acc-${address}-${idx}-${off}`}
          className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
        >
          {display}
        </a>,
      );
      segLast = off + m.length;
      return m;
    });
    if (segLast < segment.length) accountLinked.push(segment.slice(segLast));
  });

  // Pass 2b: Within remaining plain text segments, linkify regular URLs
  const urlLinkedParts: React.ReactNode[] = [];
  accountLinked.forEach((node, idx) => {
    if (typeof node !== 'string') {
      urlLinkedParts.push(node);
      return;
    }
    const segment = node as string;
    let segLast = 0;
    segment.replace(URL_REGEX, (m, _p1, _p2, _p3, off: number) => {
      // Avoid converting bare 'name.chain' (optionally followed by '/') without protocol into a link
      const isBareChainNoProtocol = !/^https?:\/\//i.test(m) && /^[\w-]+\.chain(\/|$)/i.test(m);
      if (off > segLast) urlLinkedParts.push(segment.slice(segLast, off));
      if (isBareChainNoProtocol) {
        urlLinkedParts.push(m);
      } else {
        const href = m.startsWith('http') ? m : `https://${m}`;
        const fullText = formatUrl(m);
        const display = truncateEnd(fullText, 60);
        urlLinkedParts.push(
          <a
            href={href}
            key={`${href}-${idx}-${off}`}
            target="_blank"
            rel="ugc nofollow noopener noreferrer"
            className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words no-underline"
            style={{
              display: 'inline',
              lineHeight: 'inherit',
              margin: 0,
              padding: 0,
              verticalAlign: 'baseline',
            }}
            title={m}
          >
            {display}
          </a>,
        );
      }
      segLast = off + m.length;
      return m;
    });
    if (segLast < segment.length) urlLinkedParts.push(segment.slice(segLast));
  });

  // Pass 4: Handle line breaks - split by \n and insert <br /> elements
  // Multiple consecutive line breaks collapse to a single line break
  const withLineBreaks: React.ReactNode[] = [];
  let brKeyCounter = 0; // Counter to ensure unique keys for <br /> elements
  let previousNodeWasNonString = false; // Track if previous node was a React element (link, etc.)

  urlLinkedParts.forEach((node, idx) => {
    if (typeof node !== 'string') {
      // Non-string node (link, etc.) - push it and mark that we had a non-string
      withLineBreaks.push(node);
      previousNodeWasNonString = true;
      return;
    }

    const segment = node as string;
    // Ensure we have actual newline characters for splitting
    // Split on newline, but also handle cases where newlines might be encoded differently
    const normalizedSegment = segment
      .replace(/\\n/g, '\n') // Convert escaped newlines
      .replace(/\r\n/g, '\n') // Normalize Windows line endings
      .replace(/\r/g, '\n'); // Normalize Mac line endings
    const lines = normalizedSegment.split('\n');
    let previousLineWasEmpty = false;

    // If this segment starts with a newline and previous node was non-string, add <br />
    if (lines.length > 1 && lines[0].length === 0 && previousNodeWasNonString) {
      withLineBreaks.push(<br key={`br-${idx}-start-${brKeyCounter++}`} />);
      previousLineWasEmpty = true;
      // Remove the empty first line since we've handled it
      lines.shift();
    }

    lines.forEach((line, lineIdx) => {
      const isLastLine = lineIdx === lines.length - 1;
      const isTrailingEmptyLine = isLastLine && line.length === 0;

      if (line.length > 0) {
        // Non-empty line: add <br /> before it if there was a previous line
        // (but skip if previous line was empty, as we already handled that)
        if (lineIdx > 0 && !previousLineWasEmpty) {
          withLineBreaks.push(<br key={`br-${idx}-${lineIdx}-${brKeyCounter++}`} />);
        }
        withLineBreaks.push(line);
        previousLineWasEmpty = false;
        previousNodeWasNonString = false; // Reset since we're now processing text
      } else if (lineIdx > 0 && !isTrailingEmptyLine) {
        // Empty line: only add <br /> if previous line wasn't empty (collapse consecutive breaks)
        if (!previousLineWasEmpty) {
          withLineBreaks.push(<br key={`br-${idx}-${lineIdx}-${brKeyCounter++}`} />);
          previousLineWasEmpty = true;
        }
        // Skip adding anything for consecutive empty lines (they're collapsed)
      } else {
        // First line is empty and trailing - just mark it as empty (don't add anything)
        previousLineWasEmpty = true;
      }
    });

    // If segment ends with newline, mark that next segment should add <br />
    if (normalizedSegment.endsWith('\n') && lines[lines.length - 1].length === 0) {
      previousNodeWasNonString = false; // Actually, this is text ending with newline
    }
  });

  return withLineBreaks;
}

function formatUrl(url: string): string {
  try {
    const withProtocol = url.startsWith('http') ? url : `https://${url}`;
    const u = new URL(withProtocol);
    const host = u.host.replace(/^www\./, '');
    const path = (u.pathname + u.search + u.hash) || '';
    return `${host}${path}`;
  } catch {
    return url;
  }
}

function truncateEnd(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1))}…`;
}
