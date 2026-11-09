import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  getOrCreateAnonId,
  randomUuidV4,
  resetAnonIdForTests,
} from '../anonId';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('journey anonymous id', () => {
  beforeEach(() => {
    resetAnonIdForTests();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => resetAnonIdForTests());

  it('creates a random v4 uuid and keeps it in memory for the page', () => {
    const first = getOrCreateAnonId();
    expect(first).toMatch(UUID_V4);
    expect(getOrCreateAnonId()).toBe(first);
  });

  it('stores nothing on the device: no localStorage, sessionStorage or cookie', () => {
    getOrCreateAnonId();
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe('');
  });

  it('starts a new id when the module loads again, as on a reload or a new tab', async () => {
    const first = getOrCreateAnonId();
    vi.resetModules();
    const fresh = await import('../anonId');
    const second = fresh.getOrCreateAnonId();
    expect(second).toMatch(UUID_V4);
    expect(second).not.toBe(first);
    expect(window.localStorage.length).toBe(0);
  });

  it('falls back to getRandomValues when randomUUID is missing', () => {
    const getRandomValues = vi.fn((arr: Uint8Array) => {
      arr.fill(0xff);
      return arr;
    });
    const id = randomUuidV4({ getRandomValues } as any);
    expect(getRandomValues).toHaveBeenCalled();
    expect(id).toMatch(UUID_V4);
  });
});
