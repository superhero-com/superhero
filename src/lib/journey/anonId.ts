/**
 * One random id per browser, and nothing else. It is not derived from anything (no wallet,
 * no device data), never leaves this module except in the journey payload, and is never sent
 * anywhere else. If storage is blocked (e.g. Safari private mode) it lives in memory for the tab.
 */
export const ANON_ID_STORAGE_KEY = 'sh_journey_id';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type CryptoLike = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string };
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export const isUuidV4 = (value: unknown): value is string => (
  typeof value === 'string' && UUID_V4.test(value)
);

export function randomUuidV4(cryptoImpl: CryptoLike | undefined = globalThis.crypto): string {
  if (cryptoImpl && typeof cryptoImpl.randomUUID === 'function') {
    return cryptoImpl.randomUUID().toLowerCase();
  }
  const bytes = new Uint8Array(16);
  if (cryptoImpl && typeof cryptoImpl.getRandomValues === 'function') {
    cryptoImpl.getRandomValues(bytes);
  } else {
    // No Web Crypto at all (very old engines). The id only has to be random enough not to
    // collide between browsers; it is not a secret.
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

function defaultStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Read the browser's id, creating it on first use. */
export function getOrCreateAnonId(
  storage: StorageLike | null = defaultStorage(),
  cryptoImpl?: CryptoLike,
): string {
  if (memoryId) return memoryId;
  try {
    const stored = storage?.getItem(ANON_ID_STORAGE_KEY);
    if (isUuidV4(stored)) {
      memoryId = stored;
      return stored;
    }
  } catch {
    // storage blocked: fall through to an in-memory id
  }
  const created = randomUuidV4(cryptoImpl);
  memoryId = created;
  try {
    storage?.setItem(ANON_ID_STORAGE_KEY, created);
  } catch {
    // quota / private mode: keep the in-memory id for this tab
  }
  return created;
}

/** Test hook: forget the in-memory copy. */
export function resetAnonIdForTests(): void {
  memoryId = null;
}
