// @vitest-environment node
import {
  afterEach, expect, it, vi,
} from 'vitest';
import { createDecipheriv, randomBytes, webcrypto } from 'node:crypto';
import { request } from '../api';
import { encryptUploadPart, uploadDirectPart, uploadHash } from '../shorts-direct-upload';

vi.mock('../api', async (original) => ({ ...await original<typeof import('../api')>(), request: vi.fn() }));
vi.stubGlobal('crypto', webcrypto);
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); vi.stubGlobal('crypto', webcrypto); });
async function fixture() {
  const plain = new Blob(['original video bytes']);
  const encryption = {
    bytes: plain.size,
    sha256: await uploadHash(await plain.arrayBuffer()),
    key: randomBytes(32).toString('hex'),
    iv: randomBytes(12).toString('hex'),
    aad: btoa('bound-object-identity'),
  };
  return { plain, encryption };
}

it('produces a worker-compatible authenticated envelope and catches a changed input file', async () => {
  const { plain, encryption } = await fixture();
  const body = Buffer.from(await (await encryptUploadPart(plain, encryption)).arrayBuffer());
  expect(body.subarray(0, 8).toString()).toBe('SHPRIV02');
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(encryption.key, 'hex'), body.subarray(8, 20));
  decipher.setAAD(Buffer.from(encryption.aad, 'base64')); decipher.setAuthTag(body.subarray(20, 36));
  expect(Buffer.concat([decipher.update(body.subarray(36)), decipher.final()]).toString()).toBe('original video bytes');
  expect(body.includes(Buffer.from('original video bytes'))).toBe(false);
  await expect(encryptUploadPart(plain, { ...encryption, sha256: 'a'.repeat(64) })).rejects.toThrow('changed');
});

it('sends only JSON control requests to the API and encrypted bytes directly to storage without app credentials', async () => {
  const { plain, encryption } = await fixture();
  const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 200 })); vi.stubGlobal('fetch', fetcher);
  vi.mocked(request).mockResolvedValueOnce(encryption).mockResolvedValueOnce({
    url: 'https://uploads.example.com/private/chunk?signature=test',
    method: 'PUT',
    headers: { 'if-none-match': '*' },
    expiresAt: Date.now() + 300000,
  }).mockResolvedValueOnce({});
  const controller = new AbortController();
  await uploadDirectPart('owned', 0, plain, { token: () => 'studio-session', signal: controller.signal });
  expect(vi.mocked(request).mock.calls.map(([path]) => path)).toEqual([
    '/uploads/owned/parts/0/prepare', '/uploads/owned/parts/0/authorize', '/uploads/owned/parts/0/complete',
  ]);
  const controlBodies = vi.mocked(request).mock.calls.map(([, body]) => body);
  expect(controlBodies.every((body) => !(body instanceof Blob))).toBe(true);
  expect(controlBodies.every((body) => !(body instanceof FormData))).toBe(true);
  const [url, options] = fetcher.mock.calls[0];
  expect(url).toContain('https://uploads.example.com/');
  expect(options.credentials).toBe('omit'); expect(options.redirect).toBe('error');
  expect(options.headers.Authorization).toBeUndefined();
  expect(options.body.size).toBe(plain.size + 36);
});

it('requires API verification after a 412 retry and stops when the wallet changes or the upload is cancelled', async () => {
  const { plain, encryption } = await fixture();
  const permission = {
    url: 'https://uploads.example.com/chunk', method: 'PUT', headers: {}, expiresAt: Date.now() + 300000,
  };
  vi.mocked(request).mockResolvedValueOnce(encryption).mockResolvedValueOnce(permission).mockRejectedValueOnce(new Error('object mismatch'));
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 412 })));
  await expect(uploadDirectPart('owned', 0, plain, { token: () => 'session', signal: new AbortController().signal })).rejects.toThrow('object mismatch');
  vi.mocked(request).mockClear().mockResolvedValueOnce(encryption);
  const controller = new AbortController();
  const token = vi.fn().mockReturnValueOnce('session').mockImplementation(() => { throw new Error('Wallet changed'); });
  await expect(uploadDirectPart('owned', 0, plain, { token, signal: controller.signal })).rejects.toThrow('Wallet changed');
  controller.abort();
  await expect(uploadDirectPart('owned', 0, plain, { token: () => { controller.signal.throwIfAborted(); return 'session'; }, signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
});
