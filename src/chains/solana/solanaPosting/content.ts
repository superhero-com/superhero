import { sha256 } from './program';

export type OffchainPostContent = {
  text: string;
  media: string[];
  type?: 'post' | 'comment';
  parent?: string;
  meta?: Record<string, unknown>;
};

const CORS_PROXY_PREFIX = 'https://cors.isomorphic-git.org/';

function resolveFetchableUrl(uri: string): string | null {
  const trimmed = String(uri || '').trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^ipfs:\/\//i.test(trimmed)) {
    return `https://ipfs.io/ipfs/${trimmed.replace(/^ipfs:\/\//i, '')}`;
  }
  if (/^ar:\/\//i.test(trimmed)) {
    return `https://arweave.net/${trimmed.replace(/^ar:\/\//i, '')}`;
  }
  return null;
}

function looksLikeMediaUrl(value: string): boolean {
  const s = String(value || '').trim();
  if (!s) return false;
  return /\.(gif|png|jpe?g|webp|svg|mp4|webm|mov|m4v)(\?|#|$)/i.test(s);
}

export function parseInlineContentFromUri(uri: string): { json: any; rawBytes: Uint8Array } {
  const rawBytes = new TextEncoder().encode(uri);
  const trimmed = uri.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const json = JSON.parse(trimmed);
      return { json, rawBytes };
    } catch {
      // fall through
    }
  }
  if (looksLikeMediaUrl(trimmed) || /^data:image\//i.test(trimmed)) {
    return { json: { text: '', media: [trimmed] }, rawBytes };
  }
  return { json: { text: uri }, rawBytes };
}

export async function fetchOffchainJson(uri: string): Promise<{ json: any; rawBytes: Uint8Array }> {
  const url = resolveFetchableUrl(uri);
  if (!url) return parseInlineContentFromUri(uri);

  const tryFetch = async (fetchUrl: string) => {
    const res = await fetch(fetchUrl, { method: 'GET' });
    if (!res.ok) throw new Error(`Failed to fetch content: ${res.status} ${res.statusText}`);
    return new Uint8Array(await res.arrayBuffer());
  };

  let rawBytes: Uint8Array;
  try {
    rawBytes = await tryFetch(url);
  } catch {
    try {
      rawBytes = await tryFetch(`${CORS_PROXY_PREFIX}${url}`);
    } catch {
      return parseInlineContentFromUri(uri);
    }
  }

  const text = new TextDecoder().decode(rawBytes);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { text };
  }
  return { json, rawBytes };
}

export function normalizeOffchainContent(json: any): OffchainPostContent {
  let text = '';
  if (typeof json?.text === 'string') text = json.text;
  else if (typeof json?.t === 'string') text = json.t;

  let mediaSource: any[] = [];
  if (Array.isArray(json?.media)) mediaSource = json.media;
  else if (Array.isArray(json?.m)) mediaSource = json.m;
  const media = Array.isArray(mediaSource) ? mediaSource.filter((m: any) => typeof m === 'string') : [];

  const rawType = (json?.type ?? json?.y);
  const type = (rawType === 'comment' || rawType === 'post') ? rawType : undefined;

  let parent: string | undefined;
  if (typeof json?.parent === 'string') parent = json.parent;
  else if (typeof json?.p === 'string') parent = json.p;

  const meta = (json?.meta && typeof json.meta === 'object') ? json.meta as Record<string, unknown> : undefined;

  if (media.length === 0 && typeof text === 'string' && looksLikeMediaUrl(text)) {
    return {
      text: '', media: [text], type, parent, meta,
    };
  }
  return {
    text,
    media,
    type,
    parent,
    meta,
  };
}

export async function verifyContentHash(rawBytes: Uint8Array, expected32: Uint8Array): Promise<boolean> {
  const h = await sha256(rawBytes);
  if (h.length !== expected32.length) return false;
  for (let i = 0; i < h.length; i += 1) if (h[i] !== expected32[i]) return false;
  return true;
}
