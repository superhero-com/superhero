/**
 * One random id per page load, and nothing else. It lives only in memory: nothing is written
 * to cookies, localStorage or any other storage, so a reload or a new tab starts a new id and
 * the same person is never followed across visits. It is not derived from anything (no wallet,
 * no device data) and never leaves this module except in the journey payload.
 */

type CryptoLike = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string };

export function randomUuidV4(cryptoImpl: CryptoLike | undefined = globalThis.crypto): string {
  if (cryptoImpl && typeof cryptoImpl.randomUUID === 'function') {
    return cryptoImpl.randomUUID().toLowerCase();
  }
  const bytes = new Uint8Array(16);
  if (cryptoImpl && typeof cryptoImpl.getRandomValues === 'function') {
    cryptoImpl.getRandomValues(bytes);
  } else {
    // No Web Crypto at all (very old engines). The id only has to be random enough not to
    // collide between tabs; it is not a secret.
    for (let i = 0; i < 16; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  // eslint-disable-next-line no-bitwise
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  // eslint-disable-next-line no-bitwise
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

let memoryId: string | null = null;

/** Read this page load's id, creating it on first use. */
export function getOrCreateAnonId(cryptoImpl?: CryptoLike): string {
  if (!memoryId) memoryId = randomUuidV4(cryptoImpl);
  return memoryId;
}

/** Test hook: forget the in-memory id. */
export function resetAnonIdForTests(): void {
  memoryId = null;
}
