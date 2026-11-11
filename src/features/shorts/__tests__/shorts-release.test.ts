import { webcrypto } from 'node:crypto';
import {
  beforeEach, expect, it, vi,
} from 'vitest';
import { canonicalShortsRelease, shortsDigest, shortsAe } from '../shorts-release';
import vector from './shorts-release-vector.fixture.json';

beforeEach(() => { vi.stubGlobal('crypto', webcrypto); });

it('matches the API canonical golden vector independent of receipt field order', async () => {
  const input: Record<string, unknown> = Object.fromEntries(Object.entries(vector.release).reverse());
  input.previousArtifact = Object.fromEntries(Object.entries(vector.release.previousArtifact).reverse());
  input.transaction = 'receipt-metadata';
  expect(await shortsDigest(JSON.stringify(canonicalShortsRelease(input)))).toBe(vector.digest);
});

it.each(['compiler', 'sourceHash', 'bytecodeHash', 'aciHash'])('requires the predecessor %s identity', (field) => {
  const previousArtifact = { ...vector.release.previousArtifact } as Record<string, unknown>;
  delete previousArtifact[field];
  expect(() => canonicalShortsRelease({ ...vector.release, previousArtifact })).toThrow();
});

it('rejects remote HTTP, credentials, noncanonical endpoints and unbounded prices', () => {
  ['http://remote.invalid', 'https://u:p@node.invalid', 'https://node.invalid/', 'https://node.invalid/?secret=x', 'https://node.invalid/#x'].forEach((node) => {
    expect(() => canonicalShortsRelease({ ...vector.release, node })).toThrow();
  });
  ['0', '-1', '1e18', '01', (2n ** 256n).toString()].forEach((likeFeeAetto) => {
    expect(() => canonicalShortsRelease({ ...vector.release, likeFeeAetto })).toThrow();
  });
  expect(() => canonicalShortsRelease({ ...vector.release, previousContract: null })).toThrow();
});

it('formats integer aetto exactly without floating-point rounding', () => {
  expect(shortsAe('100000000000000001')).toBe('0.100000000000000001');
  expect(shortsAe('1000000000000000000')).toBe('1');
  expect(shortsAe('0')).toBe('0');
});
