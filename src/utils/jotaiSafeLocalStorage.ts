import { createJSONStorage } from 'jotai/utils';

type SyncStringStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

export function isStorageQuotaExceededError(e: unknown): boolean {
  const error = e as { code?: number; name?: string } | null;
  return (
    !!error
    && typeof error === 'object'
    && (
      error.name === 'QuotaExceededError'
      || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      || error.code === 22
      || error.code === 1014
    )
  );
}

/** Large / rebuildable caches safe to drop before retrying a failed write. */
const EVICTABLE_KEYS = [
  'wallet:aex9Balances',
  'liquidityPositions',
  'dex:recentActivities',
] as const;

function getWindowLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getItemLength(raw: Storage, key: string): number {
  try {
    return raw.getItem(key)?.length ?? 0;
  } catch {
    return 0;
  }
}

function tryRemoveKey(raw: Storage, key: string): void {
  try {
    raw.removeItem(key);
  } catch {
    // ignore
  }
}

function tryWrite(raw: Storage, key: string, value: string): void {
  raw.setItem(key, value);
}

function evictLargestRetrying(raw: Storage, key: string, value: string): boolean {
  const keysBySize = EVICTABLE_KEYS
    .map((evictKey) => ({ key: evictKey, length: getItemLength(raw, evictKey) }))
    .filter(({ length }) => length > 0)
    .sort((a, b) => b.length - a.length);

  if (keysBySize.length === 0) {
    try {
      tryWrite(raw, key, value);
      return true;
    } catch {
      return false;
    }
  }

  return keysBySize.some(({ key: evictKey }) => {
    tryRemoveKey(raw, evictKey);
    try {
      tryWrite(raw, key, value);
      return true;
    } catch (e) {
      return !isStorageQuotaExceededError(e);
    }
  });
}

/**
 * localStorage adapter that never throws: quota errors trigger one eviction pass
 * of known-heavy keys, then a single retry; failures are swallowed so UI state can
 * still update in memory.
 */
function createSafeLocalStringStorage(): SyncStringStorage {
  const raw = getWindowLocalStorage();

  if (!raw) {
    const mem = new Map<string, string>();
    return {
      getItem: (key) => (mem.has(key) ? mem.get(key)! : null),
      setItem: (key, value) => {
        mem.set(key, value);
      },
      removeItem: (key) => {
        mem.delete(key);
      },
    };
  }

  return {
    getItem(key) {
      try {
        return raw.getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key, value) {
      try {
        tryWrite(raw, key, value);
      } catch (e) {
        if (!isStorageQuotaExceededError(e)) return;
        evictLargestRetrying(raw, key, value);
      }
    },
    removeItem(key) {
      tryRemoveKey(raw, key);
    },
  };
}

let safeStringStorageSingleton: { kind: 'browser' | 'memory'; storage: SyncStringStorage } | null = null;

function getSafeLocalStringStorage(): SyncStringStorage {
  const hasBrowserStorage = !!getWindowLocalStorage();
  if (
    !safeStringStorageSingleton
    || (hasBrowserStorage && safeStringStorageSingleton.kind === 'memory')
  ) {
    safeStringStorageSingleton = {
      kind: hasBrowserStorage ? 'browser' : 'memory',
      storage: createSafeLocalStringStorage(),
    };
  }
  return safeStringStorageSingleton.storage;
}

/**
 * JSON sync storage for `atomWithStorage` — never throws; quota-safe.
 * Use for any persisted Jotai state in this app (wallet, DEX, account, etc.).
 * Cast bridges jotai `createJSONStorage()` typing for arbitrary JSON values.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const safeLocalJSONStorage = createJSONStorage(
  getSafeLocalStringStorage,
) as any;

export const safeLocalStringStorage: SyncStringStorage = {
  getItem(key) {
    return getSafeLocalStringStorage().getItem(key);
  },
  setItem(key, value) {
    getSafeLocalStringStorage().setItem(key, value);
  },
  removeItem(key) {
    getSafeLocalStringStorage().removeItem(key);
  },
};

/** Jotai JSON sync storage shape for numeric atoms (see `atomWithStorage`). */
export type SyncJSONNumberStorage = {
  getItem: (key: string, initialValue: number) => number;
  setItem: (key: string, value: number) => void;
  removeItem: (key: string) => void;
};

function clampFiniteNumber(n: unknown, min: number, max: number, fallback: number): number {
  const x = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(x)) return Math.max(min, Math.min(max, fallback));
  return Math.max(min, Math.min(max, x));
}

/**
 * Wraps JSON storage so persisted numbers stay within bounds on read and write
 * (guards corrupt or hand-edited localStorage).
 */
export function createClampedNumberJSONStorage(
  base: SyncJSONNumberStorage,
  options: { min: number; max: number; writeFallback: number },
): SyncJSONNumberStorage {
  const { min, max, writeFallback } = options;
  return {
    getItem(key, initialValue) {
      const raw = base.getItem(key, initialValue);
      return clampFiniteNumber(raw, min, max, initialValue);
    },
    setItem(key, value) {
      const coerced = clampFiniteNumber(value, min, max, writeFallback);
      base.setItem(key, coerced);
    },
    removeItem(key) {
      base.removeItem(key);
    },
  };
}

/** One-time cleanup: AEX-9 balances are no longer persisted (too large). */
export function evictLegacyAex9BalancesCache(): void {
  safeLocalStringStorage.removeItem('wallet:aex9Balances');
}
