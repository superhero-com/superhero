import { useMemo } from 'react';

export type LinkType = 'youtube' | 'spotify' | 'twitter' | 'github' | 'image' | 'webpage';

export interface DetectedLink {
  url: string;
  type: LinkType;
  youtubeId?: string;
  spotifyType?: string;
  spotifyId?: string;
  twitterUrl?: string;
  githubOwner?: string;
  githubRepo?: string;
}

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/g;

const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

function extractYouTubeId(url: string): string | null {
  const match = YOUTUBE_PATTERNS
    .map((pattern) => url.match(pattern))
    .find((m): m is RegExpMatchArray => m !== null);
  return match ? match[1] : null;
}

function extractSpotify(url: string): { spotifyType: string; spotifyId: string } | null {
  const m = url.match(/open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]+)/);
  if (m) return { spotifyType: m[1], spotifyId: m[2] };
  return null;
}

function extractTwitter(url: string): string | null {
  if (/(?:twitter\.com|x\.com)\/\w+\/status\/\d+/.test(url)) return url;
  return null;
}

function extractGitHub(url: string): { githubOwner: string; githubRepo: string } | null {
  const m = url.match(/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\/.*)?$/);
  if (m) return { githubOwner: m[1], githubRepo: m[2] };
  return null;
}

/**
 * Strips trailing prose punctuation from a URL.
 *
 * A trailing `)` is only stripped when it's unbalanced (more `)` than `(`
 * in the URL), so links that legitimately end in `)` — e.g.
 * `https://en.wikipedia.org/wiki/Rust_(programming_language)` — stay intact,
 * while a URL pasted inside parentheses like `(https://example.com)` still
 * has its trailing `)` removed.
 */
function stripTrailingPunctuation(url: string): string {
  let result = url;
  let changed = true;
  while (changed && result.length > 0) {
    changed = false;
    const last = result[result.length - 1];
    if (/[.,;:!?'"]/.test(last)) {
      result = result.slice(0, -1);
      changed = true;
    } else if (last === ')') {
      const opens = (result.match(/\(/g) ?? []).length;
      const closes = (result.match(/\)/g) ?? []).length;
      if (closes > opens) {
        result = result.slice(0, -1);
        changed = true;
      }
    }
  }
  return result;
}

function classifyUrl(url: string): Omit<DetectedLink, 'url'> {
  const ytId = extractYouTubeId(url);
  if (ytId) return { type: 'youtube', youtubeId: ytId };

  const spotify = extractSpotify(url);
  if (spotify) return { type: 'spotify', ...spotify };

  const tweetUrl = extractTwitter(url);
  if (tweetUrl) return { type: 'twitter', twitterUrl: tweetUrl };

  const github = extractGitHub(url);
  if (github) return { type: 'github', ...github };

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
    const url = stripTrailingPunctuation(rawUrl);

    if (!URL.canParse(url)) return null;

    return { url, ...classifyUrl(url) };
  }, [text]);
}
