import { request, ShortsApiError } from './api';

export interface UploadEncryption {
  key: string;
  iv: string;
  aad: string;
  sha256: string;
  bytes: number;
}
interface UploadPermission {
  url: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresAt: number;
}
const hex = (value: string) => new Uint8Array(
  value.match(/../g)!.map((byte) => parseInt(byte, 16)),
);
export const uploadHash = async (bytes: ArrayBuffer) => Array.from(
  new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  (byte) => byte.toString(16).padStart(2, '0'),
).join('');

/** Match the worker's SHPRIV02 envelope, with an object-scoped key (never a master key). */
export async function encryptUploadPart(part: Blob, encryption: UploadEncryption) {
  if (encryption.bytes !== part.size || part.size < 1 || part.size > 1024 * 1024
    || !/^[a-f0-9]{64}$/.test(encryption.key) || !/^[a-f0-9]{24}$/.test(encryption.iv)
    || !/^[a-f0-9]{64}$/.test(encryption.sha256) || encryption.aad.length > 2048) {
    throw new Error('Invalid upload permission. Please try again.');
  }
  const plain = await part.arrayBuffer();
  if (await uploadHash(plain) !== encryption.sha256) throw new Error('The selected video changed. Choose the original file to resume.');
  const key = await crypto.subtle.importKey('raw', hex(encryption.key), 'AES-GCM', false, ['encrypt']);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({
    name: 'AES-GCM',
    iv: hex(encryption.iv),
    tagLength: 128,
    additionalData: Uint8Array.from(atob(encryption.aad), (char) => char.charCodeAt(0)),
  }, key, plain));
  return new Blob([new TextEncoder().encode('SHPRIV02'), hex(encryption.iv),
    encrypted.slice(-16), encrypted.slice(0, -16)], { type: 'application/octet-stream' });
}

export async function uploadDirectPart(id: string, index: number, part: Blob, options: {
  token: () => string;
  signal: AbortSignal;
}) {
  const path = `/uploads/${encodeURIComponent(id)}/parts/${index}`;
  const control = { signal: options.signal, timeout: 15000 };
  const sha256 = await uploadHash(await part.arrayBuffer());
  const encryption = await request<UploadEncryption>(`${path}/prepare`, { sha256 }, options.token(), control);
  const body = await encryptUploadPart(part, encryption);
  const checksum = await uploadHash(await body.arrayBuffer());
  for (let attempt = 0; attempt < 3; attempt += 1) {
    options.signal.throwIfAborted();
    options.token();
    try {
      // eslint-disable-next-line no-await-in-loop
      const permission = await request<UploadPermission>(`${path}/authorize`, { checksum }, options.token(), control);
      const url = new URL(permission.url);
      if ((url.protocol !== 'https:' && !(import.meta.env.DEV && url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
        || url.username || url.password || permission.method !== 'PUT' || permission.expiresAt <= Date.now()) {
        throw new Error('Storage upload permission is unavailable. Please try again.');
      }
      options.token();
      // Never send Studio credentials to storage or follow a redirect.
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(url.href, {
        method: 'PUT',
        body,
        headers: permission.headers,
        credentials: 'omit',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.any([options.signal, AbortSignal.timeout(120000)]),
      });
      // Only the API's HEAD validation can accept a retry after a lost response.
      if (!response.ok && response.status !== 412) {
        // eslint-disable-next-line no-await-in-loop
        await response.body?.cancel();
        throw new ShortsApiError('Video upload interrupted. Please try again.', response.status);
      }
      // eslint-disable-next-line no-await-in-loop
      await response.body?.cancel();
      // eslint-disable-next-line no-await-in-loop
      await request(`${path}/complete`, {}, options.token(), control);
      return;
    } catch (error) {
      options.signal.throwIfAborted();
      options.token();
      if (attempt === 2 || !(error instanceof TypeError
        || (error instanceof DOMException && error.name === 'TimeoutError')
        || (error instanceof ShortsApiError
          && [403, 408, 409, 429, 500, 502, 503, 504].includes(error.status)))) throw error;
    }
  }
}
