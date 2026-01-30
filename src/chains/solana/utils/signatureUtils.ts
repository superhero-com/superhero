import bs58 from 'bs58';
import { Buffer } from 'buffer';

export function ensureBase58Signature(signature: string): string {
  if (signature.includes('/') || signature.includes('+') || signature.includes('=')) {
    try {
      const buffer = Buffer.from(signature, 'base64');
      return bs58.encode(buffer);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[ensureBase58Signature] Failed to convert base64 to base58:', e);
      return signature;
    }
  }
  return signature;
}
