import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  LEGACY_ANON_ID_STORAGE_KEY,
  getOrCreateAnonId,
  isUuidV4,
  randomUuidV4,
  resetAnonIdForTests,
} from '../anonId';

const spyStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => (data.has(k) ? data.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => { data.set(k, v); }),
    removeItem: vi.fn((k: string) => { data.delete(k); }),
  };
};

describe('journey anonymous id', () => {
  beforeEach(() => {
    resetAnonIdForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => resetAnonIdForTests());

  it('creates a random v4 uuid and keeps it in memory for the tab', () => {
    const first = getOrCreateAnonId();
    expect(isUuidV4(first)).toBe(true);
    expect(getOrCreateAnonId()).toBe(first);
  });

  it('stores nothing on the device: no localStorage, sessionStorage or cookie', () => {
    getOrCreateAnonId();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('never reads or writes storage, only removes the old key', () => {
    const storage = spyStorage();
    getOrCreateAnonId(storage);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).toHaveBeenCalledWith(LEGACY_ANON_ID_STORAGE_KEY);
  });

  it('ignores and removes an id left in localStorage by an earlier build', () => {
    const old = '3f2c8a4e-1b2d-4c3e-8f9a-0b1c2d3e4f5a';
    window.localStorage.setItem(LEGACY_ANON_ID_STORAGE_KEY, old);
    const id = getOrCreateAnonId();
    expect(id).not.toBe(old);
    expect(window.localStorage.getItem(LEGACY_ANON_ID_STORAGE_KEY)).toBeNull();
  });

  it('starts a new id after a reload or in a new tab', () => {
    const first = getOrCreateAnonId();
    resetAnonIdForTests();
    expect(getOrCreateAnonId()).not.toBe(first);
  });

  it('still works when storage throws', () => {
    const storage = { removeItem: vi.fn(() => { throw new Error('SecurityError'); }) };
    const first = getOrCreateAnonId(storage);
    expect(isUuidV4(first)).toBe(true);
    expect(getOrCreateAnonId(storage)).toBe(first);
  });

  it('works with no storage at all', () => {
    expect(isUuidV4(getOrCreateAnonId(null))).toBe(true);
  });

  it('falls back to getRandomValues when randomUUID is missing', () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      arr.fill(0xff);
      return arr;
    });
    const id = randomUuidV4({ getRandomValues } as any);
    expect(getRandomValues).toHaveBeenCalled();
    expect(isUuidV4(id)).toBe(true);
  });
});
