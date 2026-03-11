import { encode, Encoding } from '@aeternity/aepp-sdk';

const hexToBytes = (hex: string): Uint8Array => {
  const normalized = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length % 2 !== 0) {
    throw new Error('Secret key has invalid hex format');
  }

  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
};

/**
 * aepp-sdk v14 expects `sk_` encoded 32-byte secrets.
 * Older persisted values can be raw hex or a longer keypair payload.
 */
export const normalizeSecretKey = (rawSecret: string): `sk_${string}` => {
  const secret = rawSecret.trim();
  if (!secret) {
    throw new Error('Secret key is missing');
  }

  if (secret.startsWith('sk_')) return secret as `sk_${string}`;

  const secretBytes = hexToBytes(secret);
  if (secretBytes.length < 32) {
    throw new Error('Secret key must contain at least 32 bytes');
  }

  return encode(
    secretBytes.subarray(0, 32),
    Encoding.AccountSecretKey,
  ) as `sk_${string}`;
};
