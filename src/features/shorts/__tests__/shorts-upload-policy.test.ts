// @vitest-environment node
import { createHash } from 'node:crypto';
import {
  afterEach, expect, it, vi,
} from 'vitest';
import { hashUploadFile } from '../shorts-direct-upload';
import {
  readSavedUpload, uploadCapability, uploadSelectionLimit, validateUploadSession, UPLOAD_PART_BYTES,
} from '../shorts-upload-policy';
import type { Config } from '../types';
import type { UploadSession } from '../shorts-upload-session';

afterEach(() => vi.unstubAllGlobals());
const source = {
  bytes: 100000000, sha256: 'a'.repeat(64), maxBytes: 100000000, format: 'original-file-v1' as const,
};
const session: UploadSession = {
  id: 'saved', parts: [0, 95], partSize: UPLOAD_PART_BYTES, transport: 'direct-s3-v1', expires: Date.now() + 600000, status: 'uploading', complete: false, source,
};
const capability = {
  version: 1, transport: 'direct-s3-v1', format: 'original-file-v1', maxBytes: 100000000, partSize: UPLOAD_PART_BYTES, minDuration: 2, maxDuration: 60,
};
it('requires an advertised adaptive-original upload capability', () => {
  expect(uploadCapability({} as Config)).toBeUndefined();
  expect(uploadCapability({ uploads: capability } as Config)?.maxBytes).toBe(100000000);
  [{ maxBytes: 100000001 }, { maxBytes: 0 }, { partSize: 100000000 }, { format: 'unknown' }, { format: 'legacy-directory-v1' }, { transport: 'api-parts-v1' }, { version: 2 }].forEach((patch) => {
    expect(uploadCapability({ uploads: { ...capability, ...patch } } as Config)).toBeUndefined();
  });
});
it('allows an accepted source after a limit decrease only when the server confirms the same file and session', () => {
  const saved = {
    id: session.id, expires: session.expires, fingerprint: 'f'.repeat(64), source,
  };
  expect(uploadSelectionLimit(10000000, saved)).toBe(100000000);
  expect(() => validateUploadSession(session, source, 'saved')).not.toThrow();
  [{ id: 'other' }, { source: { ...source, sha256: 'b'.repeat(64) } }, { source: { ...source, bytes: 99999999 } }, { parts: [96] }, { parts: [1, 1] }, { partSize: 100000000 }, { source: undefined }].forEach((patch) => {
    expect(() => validateUploadSession({ ...session, ...patch }, source, 'saved')).toThrow();
  });
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(saved) });
  expect(readSavedUpload('scoped-key')?.id).toBe('saved');
  expect(uploadSelectionLimit(10000000, { ...saved, expires: 0 })).toBe(100000000);
});
it('hashes an exact 100000000-byte source without asking the file for a full buffer', async () => {
  const block = new Uint8Array(UPLOAD_PART_BYTES).fill(37);
  const expected = createHash('sha256');
  for (let offset = 0; offset < source.bytes; offset += block.length) expected.update(block.subarray(0, Math.min(block.length, source.bytes - offset)));
  const sizes: number[] = [];
  const fullRead = vi.fn(() => { throw new Error('Whole-file allocation'); });
  const file = {
    size: source.bytes,
    arrayBuffer: fullRead,
    slice: (start: number, end: number) => ({ arrayBuffer: async () => { sizes.push(end - start); return block.buffer.slice(0, end - start); } }),
  } as unknown as Blob;
  expect(await hashUploadFile(file, () => {})).toBe(expected.digest('hex'));
  expect(fullRead).not.toHaveBeenCalled();
  expect(sizes).toHaveLength(96); expect(Math.max(...sizes)).toBe(UPLOAD_PART_BYTES);
});
it('checks cancellation and wallet changes after each bounded read', async () => {
  const controller = new AbortController();
  const slice = vi.fn(() => ({ arrayBuffer: async () => { controller.abort(); return new ArrayBuffer(UPLOAD_PART_BYTES); } }));
  await expect(hashUploadFile({ size: 2 * UPLOAD_PART_BYTES, slice } as unknown as Blob, () => controller.signal.throwIfAborted())).rejects.toMatchObject({ name: 'AbortError' });
  expect(slice).toHaveBeenCalledTimes(1);
  await expect(hashUploadFile(new Blob(['original']), () => { throw new Error('Wallet changed'); })).rejects.toThrow('Wallet changed');
});

it('requires a known hosted creation capability and permits accepted queued jobs after the upload window', () => {
  expect(uploadCapability({ uploads: { ...capability, creation: 'request-key-v1' } } as Config)).toBeDefined();
  expect(uploadCapability({ uploads: { ...capability, creation: 'unknown' } } as unknown as Config)).toBeUndefined();
  expect(() => validateUploadSession({ ...session, status: 'queued', expires: 1 }, source)).not.toThrow();
  expect(() => validateUploadSession({ ...session, status: 'uploading', expires: 1 }, source)).toThrow('expired');
});
