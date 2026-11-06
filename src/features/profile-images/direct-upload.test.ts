// @vitest-environment node
import {
  beforeEach, afterEach, expect, it, vi,
} from 'vitest';
import { randomBytes, webcrypto } from 'node:crypto';
import { uploadHash } from '@/features/shorts/shorts-direct-upload';
import { imageRequest } from './api';
import { uploadProfileImage } from './direct-upload';

vi.mock('./api', async (original) => ({ ...await original<typeof import('./api')>(), imageRequest: vi.fn() }));
vi.mock('@/config', () => ({ CONFIG: { NETWORK: 'ae_uat' }, API_BASE_URL: 'https://profiles.example' }));
const cid = `bafy${'a'.repeat(55)}`;
const key = 'profile-image-upload:ae_uat:ak_alice:avatar';
const records = new Map<string, string>();
const current = {
  id: 'owned', status: 'uploading', cid: null, bytes: 20, partSize: 1048576, parts: [], expiresAt: Date.now() + 300000,
};
beforeEach(() => {
  vi.clearAllMocks(); records.clear();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('localStorage', { getItem: (name: string) => records.get(name), setItem: (name: string, value: string) => records.set(name, value), removeItem: (name: string) => records.delete(name) });
});
afterEach(() => vi.unstubAllGlobals());
async function fixture() {
  const file = new Blob(['original image bytes']);
  const hash = await uploadHash(await file.arrayBuffer());
  const encryption = {
    bytes: file.size, sha256: hash, key: randomBytes(32).toString('hex'), iv: randomBytes(12).toString('hex'), aad: btoa('image-object'),
  };
  const permission = {
    url: 'https://uploads.example/private/image?signature=test', method: 'PUT', headers: { 'if-none-match': '*' }, expiresAt: Date.now() + 300000,
  };
  vi.mocked(imageRequest).mockImplementation(async (path) => {
    if (path === '/uploads') return current;
    if (path.endsWith('/prepare')) return encryption;
    if (path.endsWith('/authorize')) return permission;
    if (path.endsWith('/finish')) return { ...current, status: 'ready', cid };
    return current;
  });
  return { file, hash, permission };
}
it('sends only JSON to the API and encrypted image bytes directly to storage, verifying a retried PUT', async () => {
  const { file } = await fixture();
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 412 })); vi.stubGlobal('fetch', fetcher);
  expect(await uploadProfileImage(file, 'avatar', 'ak_alice', 'api-session', vi.fn(), vi.fn())).toBe(cid);
  expect(vi.mocked(imageRequest).mock.calls.map(([path]) => path)).toEqual([
    '/uploads', '/uploads/owned/parts/0/prepare', '/uploads/owned/parts/0/authorize', '/uploads/owned/parts/0/complete', '/uploads/owned/finish',
  ]);
  const bodies = vi.mocked(imageRequest).mock.calls.map(([, body]) => body);
  expect(bodies.every((body) => !(body instanceof Blob) && !(body instanceof FormData))).toBe(true);
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toContain('https://uploads.example/'); expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBeUndefined(); expect(options.body.size).toBe(file.size + 36);
  expect(new TextDecoder().decode(await options.body.arrayBuffer())).not.toContain('original image bytes');
});
it('does not reserve another upload after an ambiguous resume request', async () => {
  const { file, hash } = await fixture();
  records.set(key, JSON.stringify({ id: 'owned', bytes: file.size, sha256: hash }));
  vi.mocked(imageRequest).mockRejectedValue(new Error('Temporary network failure'));
  await expect(uploadProfileImage(file, 'avatar', 'ak_alice', 'session', vi.fn(), vi.fn())).rejects.toThrow('Temporary network failure');
  expect(vi.mocked(imageRequest).mock.calls.map(([path]) => path)).toEqual(['/uploads/owned']);
});
it('resumes a prepared image without uploading it again', async () => {
  const { file, hash } = await fixture();
  records.set(key, JSON.stringify({ id: 'owned', bytes: file.size, sha256: hash }));
  vi.mocked(imageRequest).mockResolvedValue({ ...current, status: 'ready', cid });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  expect(await uploadProfileImage(file, 'avatar', 'ak_alice', 'session', vi.fn(), vi.fn())).toBe(cid);
  expect(fetcher).not.toHaveBeenCalled(); expect(imageRequest).toHaveBeenCalledOnce();
});
it('rejects expired permissions before transferring bytes and stops when the wallet changes', async () => {
  const { file, permission } = await fixture(); permission.expiresAt = Date.now() - 1;
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await expect(uploadProfileImage(file, 'avatar', 'ak_alice', 'session', vi.fn(), vi.fn())).rejects.toThrow('Invalid storage permission');
  expect(fetcher).not.toHaveBeenCalled(); records.clear(); vi.mocked(imageRequest).mockClear();
  await expect(uploadProfileImage(file, 'avatar', 'ak_alice', 'session', () => { throw new Error('Wallet changed'); }, vi.fn())).rejects.toThrow('Wallet changed');
  expect(imageRequest).not.toHaveBeenCalled();
});

it('resumes each post image independently without cancelling its siblings', async () => {
  const files = [new Blob(['photo one']), new Blob(['photo two'])];
  await Promise.all(files.map(async (file, i) => {
    const hash = await uploadHash(await file.arrayBuffer());
    records.set(`profile-image-upload:ae_uat:ak_alice:post:${hash}`, JSON.stringify({ id: `image-${i}`, bytes: file.size, sha256: hash }));
  }));
  vi.mocked(imageRequest).mockResolvedValue({ ...current, status: 'ready', cid });
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await uploadProfileImage(files[0], 'post', 'ak_alice', 'session', vi.fn(), vi.fn());
  await uploadProfileImage(files[1], 'post', 'ak_alice', 'session', vi.fn(), vi.fn());
  expect(vi.mocked(imageRequest).mock.calls.map(([path]) => path)).toEqual(['/uploads/image-0', '/uploads/image-1']);
  expect(fetcher).not.toHaveBeenCalled();
});

it('cancels a direct upload without completing a part or requesting publication', async () => {
  const { file } = await fixture(); const controller = new AbortController();
  vi.stubGlobal('fetch', vi.fn(async (_url, options) => {
    controller.abort(); options.signal.throwIfAborted();
  }));
  await expect(uploadProfileImage(file, 'post', 'ak_alice', 'session', vi.fn(), vi.fn(), controller.signal)).rejects.toThrow();
  expect(vi.mocked(imageRequest).mock.calls.some(([path]) => path.endsWith('/complete') || path.endsWith('/finish'))).toBe(false);
});
