import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  ANON_ID_STORAGE_KEY,
  getOrCreateAnonId,
  isUuidV4,
  randomUuidV4,
  resetAnonIdForTests,
} from '../anonId';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((k: string) => (data.has(k) ? data.get(k)! : null)),
    setItem: vi.fn((k: string, v: string) => { data.set(k, v); }),
  };
};

describe('journey anonymous id', () => {
  beforeEach(() => resetAnonIdForTests());
  afterEach(() => resetAnonIdForTests());

  it('creates a random v4 uuid and stores it under sh_journey_id', () => {
    const storage = memoryStorage();
    const id = getOrCreateAnonId(storage);
    expect(isUuidV4(id)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(ANON_ID_STORAGE_KEY, id);
  });

  it('reuses the stored id', () => {
    const storage = memoryStorage();
    const existing = '3f2c8a4e-1b2d-4c3e-8f9a-0b1c2d3e4f5a';
    storage.data.set(ANON_ID_STORAGE_KEY, existing);
    expect(getOrCreateAnonId(storage)).toBe(existing);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('replaces a stored value that is not a v4 uuid', () => {
    const storage = memoryStorage();
    storage.data.set(ANON_ID_STORAGE_KEY, 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ');
    const id = getOrCreateAnonId(storage);
    expect(isUuidV4(id)).toBe(true);
    expect(id).not.toContain('ak_');
  });

  it('keeps an in-memory id for the tab when storage throws', () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error('SecurityError'); }),
      setItem: vi.fn(() => { throw new Error('QuotaExceededError'); }),
    };
    const first = getOrCreateAnonId(storage);
    const second = getOrCreateAnonId(storage);
    expect(isUuidV4(first)).toBe(true);
    expect(second).toBe(first);
  });

  it('works with no storage at all', () => {
    const id = getOrCreateAnonId(null);
    expect(isUuidV4(id)).toBe(true);
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
