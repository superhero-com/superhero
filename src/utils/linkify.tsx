import React from 'react';

const URL_REGEX = /((https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?)/gi;

export function linkify(text: string): React.ReactNode[] {
  if (!text) return [];
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  String(text).replace(URL_REGEX, (match, _p1, _p2, _p3, offset: number) => {
    if (offset > lastIndex) parts.push(text.slice(lastIndex, offset));
    const href = match.startsWith('http') ? match : `https://${match}`;
    parts.push(
      <a href={href} key={`${href}-${offset}`} target="_blank" rel="noopener noreferrer">{match}</a>,
    );
    lastIndex = offset + match.length;
    return match;
  });
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}


