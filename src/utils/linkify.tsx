import React from 'react';
import { Link } from 'react-router-dom';
import { formatAddress } from './address';

// URL matcher (external links)
const URL_REGEX = /((https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/[\w\-._~:\/?#[\]@!$&'()*+,;=%]*)?)/gi;
// Optional '@' followed by an AENS name ending with .chain (word boundary to avoid trailing '/')
const AENS_TAG_REGEX = /@?[a-z0-9-]+\.chain\b/gi;
// Optional '@' followed by an account address starting with ak_
const ACCOUNT_TAG_REGEX = /@?(ak_[A-Za-z0-9]+)/gi;
// Hashtags like #TOKEN, #TREND-123, #ROCK-N-ROLL; allow letters, numbers, and dashes only
const HASHTAG_REGEX = /#([A-Za-z0-9-]{1,50})/g;

export function linkify(text: string, options?: { knownChainNames?: Set<string> }): React.ReactNode[] {
  if (!text) return [];
  let raw = String(text);
  
  // Decode HTML entities first (in case content is HTML-encoded)
  // Use a safe method that works in both browser and SSR contexts
  const decodeHtmlEntities = (str: string): string => {
    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.innerHTML = str;
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

  // Pass 1: Identify AENS mentions and turn them into profile links
  const aensLinked: React.ReactNode[] = [];
  let last = 0;
  raw.replace(AENS_TAG_REGEX, (match: string, offset: number) => {
    if (offset > last) aensLinked.push(raw.slice(last, offset));
    const name = match.startsWith('@') ? match.slice(1) : match; // strip optional '@'
    const normalized = name.toLowerCase();
    const isKnown = options?.knownChainNames?.has(normalized) ?? false;
    if (isKnown) {
      aensLinked.push(
        <a
          href={`/users/${name}`}
          key={`aens-${name}-${offset}`}
          className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
          style={{
            WebkitTextFillColor: 'currentColor',
            WebkitBackgroundClip: 'initial',
            backgroundClip: 'initial',
            background: 'none',
          }}
        >
          {match}
        </a>
      );
    } else {
      // Unknown name → keep as plain text
      aensLinked.push(match);
    }
    last = offset + match.length;
    return match;
  });
  if (last < raw.length) aensLinked.push(raw.slice(last));

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
      const displayCore = formatAddress(address);
      const display = m.startsWith('@') ? `@${displayCore}` : displayCore;
      accountLinked.push(
        <a
          href={`/users/${address}`}
          key={`acc-${address}-${idx}-${off}`}
          className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
          style={{
            WebkitTextFillColor: 'currentColor',
            WebkitBackgroundClip: 'initial',
            backgroundClip: 'initial',
            background: 'none',
          }}
        >
          {display}
        </a>
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
              WebkitTextFillColor: 'currentColor',
              WebkitBackgroundClip: 'initial',
              backgroundClip: 'initial',
              background: 'none',
              verticalAlign: 'baseline',
            }}
            title={m}
          >
            {display}
          </a>
        );
      }
      segLast = off + m.length;
      return m;
    });
    if (segLast < segment.length) urlLinkedParts.push(segment.slice(segLast));
  });

  // Pass 3: Hashtags → router link to trending tokens page (/trends/tokens/<UPPERCASE>)
  const finalParts: React.ReactNode[] = [];
  urlLinkedParts.forEach((node, idx) => {
    if (typeof node !== 'string') {
      finalParts.push(node);
      return;
    }
    const segment = node as string;
    let last = 0;
    segment.replace(HASHTAG_REGEX, (m: string, tag: string, off: number) => {
      if (off > last) finalParts.push(segment.slice(last, off));
      const target = `/trends/tokens/${tag.toUpperCase()}`;
      finalParts.push(
        <Link
          to={target}
          key={`hashtag-${tag}-${idx}-${off}`}
          className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
          style={{
            WebkitTextFillColor: 'currentColor',
            WebkitBackgroundClip: 'initial',
            backgroundClip: 'initial',
            background: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {m}
        </Link>
      );
      last = off + m.length;
      return m;
    });
    if (last < segment.length) finalParts.push(segment.slice(last));
  });

  // Pass 4: Handle line breaks - split by \n and insert <br /> elements
  // Multiple consecutive line breaks collapse to a single line break
  const withLineBreaks: React.ReactNode[] = [];
  let brKeyCounter = 0; // Counter to ensure unique keys for <br /> elements
  let previousNodeWasNonString = false; // Track if previous node was a React element (link, etc.)
  
  finalParts.forEach((node, idx) => {
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
      .replace(/\\n/g, '\n')  // Convert escaped newlines
      .replace(/\r\n/g, '\n') // Normalize Windows line endings
      .replace(/\r/g, '\n');   // Normalize Mac line endings
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

export function formatUrl(url: string): string {
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

export function truncateEnd(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)) + '…';
}


