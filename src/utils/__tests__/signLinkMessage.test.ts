import { describe, expect, it } from 'vitest';
import { normalizeLinkSignature } from '@/utils/signLinkMessage';

describe('normalizeLinkSignature', () => {
  it('normalizes hex strings with 0x prefix', () => {
    expect(normalizeLinkSignature('0xAbCd')).toBe('abcd');
  });

  it('normalizes byte arrays', () => {
    expect(normalizeLinkSignature(new Uint8Array([0xab, 0xcd]))).toBe('abcd');
  });

  it('unwraps nested signature objects', () => {
    expect(normalizeLinkSignature({ raw: '0xef01' })).toBe('ef01');
    expect(normalizeLinkSignature({ value: new Uint8Array([0x12, 0x34]) })).toBe('1234');
  });

  it('rejects unsupported signature shapes', () => {
    expect(() => normalizeLinkSignature({ unexpected: true })).toThrow(
      'Wallet did not return a valid signature',
    );
  });
});
