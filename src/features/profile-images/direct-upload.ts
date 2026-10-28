import { CONFIG } from '@/config';
import { encryptUploadPart, uploadHash, UploadEncryption } from '@/features/shorts/shorts-direct-upload';
import { MediaRole, imageRequest, ImageRequestError } from './api';

interface Upload { id: string; status: string; cid: string | null; partSize: number; parts: number[]; expiresAt: number; error?: string }
interface Permission { url: string; method: 'PUT'; headers: Record<string, string>; expiresAt: number }

/** Reuse the Shorts encrypted direct-upload protocol; API requests contain JSON only. */
export async function uploadProfileImage(file: Blob, role: MediaRole, address: string, token: string, checkWallet: () => void, progress: (message: string) => void, signal?: AbortSignal) {
  const request = <T, >(path: string, body?: unknown, session?: string) => imageRequest<T>(path, body, session, signal);
  const check = () => { signal?.throwIfAborted(); checkWallet(); };
  check();
  const sha256 = await uploadHash(await file.arrayBuffer());
  const key = `profile-image-upload:${CONFIG.NETWORK}:${address}:${role}${role === 'post' ? `:${sha256}` : ''}`;
  let upload: Upload | undefined;
  let saved: { sha256?: string; bytes?: number; id?: string } | null = null;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* Storage can be disabled in private browsing. */ }
  try {
    if (saved?.sha256 === sha256 && saved.bytes === file.size && typeof saved.id === 'string') {
      upload = await request<Upload>(`/uploads/${saved.id}`, undefined, token);
      if (upload.status === 'failed' || (role === 'post' && upload.expiresAt <= Date.now()) || (upload.status === 'uploading' && upload.expiresAt <= Date.now())) upload = undefined;
    } else if (typeof saved?.id === 'string') await request(`/uploads/${saved.id}/cancel`, {}, token);
  } catch (error) {
    // A lost status response must not create another upload or consume another reservation.
    if (!(error instanceof ImageRequestError) || ![404, 410].includes(error.status)) throw error;
  }
  check();
  if (!upload) {
    upload = await request<Upload>('/uploads', { role, bytes: file.size, sha256 }, token);
    try { localStorage.setItem(key, JSON.stringify({ id: upload.id, bytes: file.size, sha256 })); } catch { /* Uploading still works when local storage is unavailable. */ }
  }
  if (upload.partSize !== 1024 * 1024) throw new Error('Invalid image upload configuration.');
  if (upload.status === 'uploading') {
    for (let index = 0; index < Math.ceil(file.size / upload.partSize); index += 1) {
      check();
      // eslint-disable-next-line no-continue -- Previously verified parts need no transfer.
      if (upload.parts.includes(index)) continue;
      const part = file.slice(index * upload.partSize, (index + 1) * upload.partSize);
      const path = `/uploads/${upload.id}/parts/${index}`;
      // eslint-disable-next-line no-await-in-loop
      const hash = await uploadHash(await part.arrayBuffer());
      // eslint-disable-next-line no-await-in-loop
      const encryption = await request<UploadEncryption>(`${path}/prepare`, { sha256: hash }, token);
      // eslint-disable-next-line no-await-in-loop
      const body = await encryptUploadPart(part, encryption);
      // eslint-disable-next-line no-await-in-loop
      const checksum = await uploadHash(await body.arrayBuffer());
      let completed = false;
      for (let attempt = 0; attempt < 3 && !completed; attempt += 1) {
        check();
        try {
          // eslint-disable-next-line no-await-in-loop
          const permission = await request<Permission>(`${path}/authorize`, { checksum }, token);
          const url = new URL(permission.url);
          if (url.protocol !== 'https:' || url.username || url.password || permission.method !== 'PUT' || permission.expiresAt <= Date.now()) throw new Error('Invalid storage permission.');
          // File bytes are sent only to storage; never include API session credentials here.
          // eslint-disable-next-line no-await-in-loop
          const response = await fetch(url.href, {
            method: 'PUT',
            headers: permission.headers,
            body,
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
            signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(60000)]) : AbortSignal.timeout(60000),
          });
          // eslint-disable-next-line no-await-in-loop
          await response.body?.cancel();
          if (!response.ok && response.status !== 412) throw new Error('Image upload was interrupted.');
          // eslint-disable-next-line no-await-in-loop
          await request(`${path}/complete`, {}, token);
          completed = true;
        } catch (error) { check(); if (attempt === 2) throw error; }
      }
    }
    check();
    upload = await request<Upload>(`/uploads/${upload.id}/finish`, {}, token);
  }
  progress('Compressing and preparing your image…');
  const deadline = Date.now() + 240000;
  while (upload.status !== 'ready') {
    check();
    if (upload.status === 'failed') throw new Error(upload.error || 'This image could not be prepared.');
    if (Date.now() > deadline) throw new Error('Your image is still processing. Choose the same image again to check its progress.');
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => { setTimeout(resolve, 1500); });
    // eslint-disable-next-line no-await-in-loop
    upload = await request<Upload>(`/uploads/${upload.id}`, undefined, token);
  }
  check();
  if (!upload.cid || !/^bafy[a-z2-7]{55}$/.test(upload.cid)) throw new Error('Invalid image result.');
  return upload.cid;
}
