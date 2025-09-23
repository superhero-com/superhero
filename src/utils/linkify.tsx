import React from 'react';

const URL_REGEX = /((https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;

export function linkify(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  String(text).replace(URL_REGEX, (match, _p1, _p2, _p3, offset: number) => {
    if (offset > lastIndex) parts.push(text.slice(lastIndex, offset));
    const href = match.startsWith('http') ? match : `https://${match}`;
    const fullText = formatUrl(match);
    const display = truncateEnd(fullText, 60);
    parts.push(
      <a
        href={href}
        key={`${href}-${offset}`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-block',
          width: 'auto',
          maxWidth: '100%',
          verticalAlign: 'bottom',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
        title={match}
      >
        {display}
      </a>,
    );
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
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
  return text.slice(0, Math.max(0, max - 1)) + '…';
}


