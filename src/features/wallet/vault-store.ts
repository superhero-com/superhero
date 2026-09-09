/**
 * Vault persistence.
 *
 * The single VaultRecord lives in the wallet origin's OWN IndexedDB (same-origin
 * custody, the custody decision). This module is a thin adapter behind a `VaultStore`
 * interface so the record logic (vault-record.ts) stays storage-agnostic and
 * unit-testable via the in-memory implementation.
 *
 * Durability caveat carried from the threat model (R-04): IndexedDB is subject
 * to Safari ITP 7-day eviction — this store is NOT loss-proof, which is exactly
 * why the written-mnemonic backup + recovery code are mandatory. Never treat a
 * successful `save()` as a durable backup.
 */
import type { VaultRecord } from './vault-record';

export interface VaultStore {
  load(): Promise<VaultRecord | null>;
  save(record: VaultRecord): Promise<void>;
  clear(): Promise<void>;
}

/** In-memory store — for tests and non-persistent dev only (never real custody). */
export function createInMemoryVaultStore(seed: VaultRecord | null = null): VaultStore {
  let current: VaultRecord | null = seed;
  return {
    async load() { return current; },
    async save(record) { current = record; },
    async clear() { current = null; },
  };
}

const DB_NAME = 'superhero-wallet';
const STORE_NAME = 'vault';
const RECORD_KEY = 'vault';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
    const req = run(store);
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  });
}

/**
 * IndexedDB-backed store (browser). Persists one VaultRecord under a fixed key.
 * The record is plain JSON (all secret material is base64 ciphertext), so the
 * structured clone is safe. Browser-only — exercised at P5 on-device, not in the
 * headless unit suite (jsdom has no IndexedDB).
 */
export function createIndexedDbVaultStore(): VaultStore {
  return {
    async load() {
      const db = await openDb();
      try { return (await tx<VaultRecord | undefined>(db, 'readonly', (s) => s.get(RECORD_KEY))) ?? null; } finally { db.close(); }
    },
    async save(record) {
      const db = await openDb();
      try { await tx(db, 'readwrite', (s) => s.put(record, RECORD_KEY)); } finally { db.close(); }
    },
    async clear() {
      const db = await openDb();
      try { await tx(db, 'readwrite', (s) => s.delete(RECORD_KEY)); } finally { db.close(); }
    },
  };
}
