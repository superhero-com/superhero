import { API_BASE_URL } from '@/config';

export type ImageRole = 'avatar' | 'cover';
export type MediaRole = ImageRole | 'post';
export interface ProfileImages {
  address: string; avatarurl: string; avatar_thumbnail_url: string; coverurl: string;
  avatar_cid: string | null; cover_cid: string | null;
  avatar_ref?: string; avatar_preview_ref?: string; cover_ref?: string; cover_preview_ref?: string; cover_thumbnail_url?: string;
}
export interface ImageConfig {
  enabled: boolean; network: string; contract: string; origin: string; maxBytes: number; posts?: { maxImages: number; maxDimension: number };
}
export interface ImageSession { token: string; address: string; expiresAt: number }
export interface ImageWrite { id: string; role: ImageRole; cid: string | null; status: string; txHash: string | null; error: string | null }
export type ImageWriteStatus = Pick<ImageWrite, 'id' | 'role' | 'status'>;
const base = `${(import.meta.env.VITE_PROFILE_MEDIA_API_URL || API_BASE_URL).replace(/\/$/, '')}/api/profile-media`;
export class ImageRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function imageRequest<T>(path: string, body?: unknown, token?: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    credentials: 'omit',
    redirect: 'error',
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(115000)]) : AbortSignal.timeout(115000),
  });
  const data = await response.json();
  if (!response.ok) throw new ImageRequestError(typeof data.message === 'string' ? data.message : `Image request failed (${response.status})`, response.status);
  return data;
}

export const imageReference = (cid: string, preview = false) => `ipfs:superhero:images:${cid}${preview ? '-preview' : ''}`;
export const profileImageReference = (cid: string) => `ipfs_superhero_images_${cid}`;
export function parseImageReference(value: unknown) {
  if (typeof value !== 'string') return undefined;
  const match = /^(?:ipfs:superhero:images:|ipfs_superhero_images_)(bafy[a-z2-7]{55})(-preview)?$/
    .exec(value);
  return match ? { cid: match[1], preview: !!match[2] } : undefined;
}

// The delivery location is deployment configuration, never part of an image identity.
const deliveryBase = (import.meta.env.VITE_PROFILE_MEDIA_PUBLIC_URL || new URL('/profile-images', base).href).replace(/\/$/, '');
export function imageUrl(value?: string, variant?: 'full' | 'preview'): string | undefined {
  if (!value) return undefined;
  try {
    const expected = new URL(deliveryBase);
    if (!['http:', 'https:'].includes(expected.protocol) || expected.username || expected.password || expected.search || expected.hash) return undefined;
    let reference = parseImageReference(value);
    if (!reference) {
      const url = new URL(value);
      if (url.username || url.password || url.search || url.hash) return undefined;
      const current = url.origin === expected.origin && url.pathname.startsWith(`${expected.pathname}/images/`);
      // Previously published URLs remain readable even after changing hosts/prefixes.
      const legacy = ['https://superhero.stream', new URL(base).origin].includes(url.origin)
        && url.pathname.startsWith('/profile-images/images/');
      if (!current && !legacy) return undefined;
      const match = /^\/(bafy[a-z2-7]{55})\/(image|thumb)\.webp$/.exec(url.pathname.slice((current ? expected.pathname : '/profile-images').length + 7));
      if (!match) return undefined;
      reference = { cid: match[1], preview: match[2] === 'thumb' };
    }
    const preview = variant ? variant === 'preview' : reference.preview;
    return `${deliveryBase}/images/${reference.cid}/${preview ? 'thumb' : 'image'}.webp`;
  } catch { return undefined; }
}

type PendingRead = { address: string; resolve: (value: ProfileImages) => void; reject: (error: unknown) => void };
const queued: PendingRead[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
function flush() {
  const batch = queued.splice(0, 50);
  timer = queued.length ? setTimeout(flush, 20) : undefined;
  imageRequest<ProfileImages[]>(`/batch?addresses=${encodeURIComponent([...new Set(batch.map((row) => row.address))].join(','))}`)
    .then((rows) => batch.forEach((request) => {
      const row = rows.find((item) => item.address === request.address);
      if (row) request.resolve(row); else request.reject(new Error('Image lookup returned no profile'));
    })).catch((error) => batch.forEach((request) => request.reject(error)));
}
export function readProfileImages(address: string): Promise<ProfileImages> {
  return new Promise((resolve, reject) => {
    queued.push({ address, resolve, reject });
    timer ??= setTimeout(flush, 20);
  });
}
