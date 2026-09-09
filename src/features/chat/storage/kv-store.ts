/**
 * kv-store.ts — the async key/value surface the ported chat `*.storage.ts`
 * services expect.
 *
 * The mobile services talk to `@react-native-async-storage/async-storage`
 * (`getItem` / `setItem` / `removeItem` / `getAllKeys` / `multiGet` /
 * `multiRemove` / `clear`). This module reproduces that exact surface over
 * IndexedDB — NOT `localStorage`, which has a ~5 MB quota and is synchronous and
 * so is the wrong target for message history. Stages 3–4 port their services by
 * swapping the AsyncStorage import for a `KeyValueStore`, with no key or call-site
 * changes.
 *
 * This plain store is for NON-secret records (relay config, manifests). Message
 * history MUST be wrapped in `createEncryptedKeyValueStore` so it is ciphertext
 * at rest.
 */

/** The AsyncStorage-compatible async KV surface. */
export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<string[]>;
  multiGet(keys: string[]): Promise<Array<[string, string | null]>>;
  multiRemove(keys: string[]): Promise<void>;
  clear(): Promise<void>;
}

export interface IndexedDbKeyValueStoreOptions {
  dbName?: string;
  storeName?: string;
}

const DEFAULT_DB_NAME = 'superhero-chat';
const DEFAULT_STORE_NAME = 'kv';

function openDb(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(storeName)) {
        req.result.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * IndexedDB-backed `KeyValueStore`. One object store keyed by string; values are
 * strings (the caller JSON-serializes, exactly as the AsyncStorage services do).
 * Browser-only — jsdom has no IndexedDB, so unit tests use a fake-indexeddb
 * shim or the in-memory store below.
 */
export function createIndexedDbKeyValueStore(
  options: IndexedDbKeyValueStoreOptions = {},
): KeyValueStore {
  const dbName = options.dbName ?? DEFAULT_DB_NAME;
  const storeName = options.storeName ?? DEFAULT_STORE_NAME;

  async function withStore<T>(
    mode: IDBTransactionMode,
    run: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await openDb(dbName, storeName);
    try {
      const tx = db.transaction(storeName, mode);
      const result = await run(tx.objectStore(storeName));
      // `tx` is a local const, not a param — safe to attach completion handlers.
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      return result;
    } finally {
      db.close();
    }
  }

  return {
    getItem(key) {
      return withStore('readonly', async (store) => {
        const value = await request<string | undefined>(store.get(key));
        return value ?? null;
      });
    },
    setItem(key, value) {
      return withStore('readwrite', async (store) => {
        await request(store.put(value, key));
      });
    },
    removeItem(key) {
      return withStore('readwrite', async (store) => {
        await request(store.delete(key));
      });
    },
    getAllKeys() {
      return withStore('readonly', async (store) => {
        const keys = await request<IDBValidKey[]>(store.getAllKeys());
        return keys.map((k) => String(k));
      });
    },
    multiGet(keys) {
      return withStore('readonly', async (store) => Promise.all(
        keys.map(async (key): Promise<[string, string | null]> => {
          const value = await request<string | undefined>(store.get(key));
          return [key, value ?? null];
        }),
      ));
    },
    multiRemove(keys) {
      return withStore('readwrite', async (store) => {
        await Promise.all(keys.map((key) => request(store.delete(key))));
      });
    },
    clear() {
      return withStore('readwrite', async (store) => {
        await request(store.clear());
      });
    },
  };
}

/**
 * In-memory `KeyValueStore` — for tests and non-persistent dev only. Never a
 * custody surface (it holds whatever the caller writes, in the clear).
 */
export function createInMemoryKeyValueStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    async getItem(key) {
      return map.has(key) ? map.get(key)! : null;
    },
    async setItem(key, value) {
      map.set(key, value);
    },
    async removeItem(key) {
      map.delete(key);
    },
    async getAllKeys() {
      return [...map.keys()];
    },
    async multiGet(keys) {
      return keys.map((key): [string, string | null] => [key, map.has(key) ? map.get(key)! : null]);
    },
    async multiRemove(keys) {
      keys.forEach((key) => map.delete(key));
    },
    async clear() {
      map.clear();
    },
  };
}
