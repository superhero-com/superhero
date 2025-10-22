import React from 'react';
import { Link } from 'react-router-dom';
import HashtagWithChange from '../features/social/components/HashtagWithChange';
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
  const raw = String(text);

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
          className="underline-offset-2 hover:underline break-words"
          style={{
            color: '#00ff9d',
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
          className="underline-offset-2 hover:underline break-words"
          style={{
            color: '#00ff9d',
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
            rel="noopener noreferrer"
            className="underline-offset-2 hover:underline break-words no-underline"
            style={{
              display: 'inline',
              lineHeight: 'inherit',
              margin: 0,
              padding: 0,
              color: '#00ff9d',
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

  // Pass 3: Hashtags → router link with inline 24h change if tokenized trend
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
      finalParts.push(
        <span key={`hashtag-${tag}-${idx}-${off}`}>
          <HashtagWithChange tag={`#${tag}`} />
        </span>
      );
      last = off + m.length;
      return m;
    });
    if (last < segment.length) finalParts.push(segment.slice(last));
  });

  return finalParts;
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


