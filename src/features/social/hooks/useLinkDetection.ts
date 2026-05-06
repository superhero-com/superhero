import { useMemo } from 'react';

export type LinkType = 'youtube' | 'image' | 'webpage';

export interface DetectedLink {
  url: string;
  type: LinkType;
  youtubeId?: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

function extractYouTubeId(url: string): string | null {
  for (const pattern of YOUTUBE_PATTERNS) {
    const m = url.match(pattern);
    if (m) return m[1];
  }
  return null;
}

function classifyUrl(url: string): { type: LinkType; youtubeId?: string } {
  const ytId = extractYouTubeId(url);
  if (ytId) return { type: 'youtube', youtubeId: ytId };

  if (/\.(jpg|jpeg|png|gif|webp|svg|avif)(\?.*)?$/i.test(url)) {
    return { type: 'image' };
  }

  return { type: 'webpage' };
}

/**
 * Detects the first URL in a block of text and classifies it.
 * Returns null if no URL is found.
 */
export function useLinkDetection(text: string): DetectedLink | null {
  return useMemo(() => {
    const matches = text.match(URL_REGEX);
    if (!matches || matches.length === 0) return null;

    // Use the first URL found
    const rawUrl = matches[0];
    // Strip trailing punctuation that might be part of prose
    const url = rawUrl.replace(/[.,;:!?)'"]+$/, '');

    try {
      // Validate it's actually a parseable URL
      new URL(url);
    } catch {
      return null;
    }

    const { type, youtubeId } = classifyUrl(url);
    return { url, type, youtubeId };
  }, [text]);
}
