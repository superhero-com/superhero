import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  createClampedNumberJSONStorage,
  evictLegacyAex9BalancesCache,
  isStorageQuotaExceededError,
  safeLocalStringStorage,
  type SyncJSONNumberStorage,
} from '../jotaiSafeLocalStorage';

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('isStorageQuotaExceededError', () => {
  it('detects DOMException QuotaExceededError', () => {
    const e = new DOMException('q', 'QuotaExceededError');
    expect(isStorageQuotaExceededError(e)).toBe(true);
  });

  it('detects duck-typed quota errors', () => {
    expect(isStorageQuotaExceededError({ name: 'QuotaExceededError' })).toBe(true);
  });

  it('detects legacy quota error shapes', () => {
    expect(isStorageQuotaExceededError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isStorageQuotaExceededError({ code: 22 })).toBe(true);
    expect(isStorageQuotaExceededError({ code: 1014 })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isStorageQuotaExceededError(new Error('nope'))).toBe(false);
    expect(isStorageQuotaExceededError(null)).toBe(false);
  });
});

describe('safeLocalStringStorage', () => {
  it('evicts the largest known-heavy key and retries once when quota is exceeded', () => {
    localStorage.setItem('wallet:aex9Balances', 'small');
    localStorage.setItem('liquidityPositions', 'x'.repeat(200));
    localStorage.setItem('dex:recentActivities', 'medium');

    const quotaError = new DOMException('full', 'QuotaExceededError');
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    setSpy
      .mockImplementationOnce(() => {
        throw quotaError;
      })
      .mockImplementation(function setItem(this: Storage, key: string, value: string) {
        setSpy.mockRestore();
        this.setItem(key, value);
      });

    expect(() => safeLocalStringStorage.setItem('wallet:currency', '"usd"')).not.toThrow();
    expect(localStorage.getItem('liquidityPositions')).toBeNull();
    expect(localStorage.getItem('wallet:currency')).toBe('"usd"');
    expect(localStorage.getItem('wallet:aex9Balances')).toBe('small');
    expect(localStorage.getItem('dex:recentActivities')).toBe('medium');
  });

  it('does not throw when quota retry still fails', () => {
    localStorage.setItem('liquidityPositions', 'x'.repeat(200));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });

    expect(() => safeLocalStringStorage.setItem('wallet:currency', '"usd"')).not.toThrow();
  });
});

describe('createClampedNumberJSONStorage', () => {
  const makeBase = (): SyncJSONNumberStorage & { log: { key: string; value: number }[] } => {
    const map = new Map<string, number>();
    const log: { key: string; value: number }[] = [];
    return {
      log,
      getItem(key, initialValue) {
        if (!map.has(key)) return initialValue;
        return map.get(key)!;
      },
      setItem(key, value) {
        log.push({ key, value });
        map.set(key, value);
      },
      removeItem(key) {
        map.delete(key);
      },
    };
  };

  it('clamps on read using initialValue when stored value is out of range', () => {
    const base = makeBase();
    base.setItem('k', 999);
    const storage = createClampedNumberJSONStorage(base, { min: 0, max: 50, writeFallback: 5 });
    expect(storage.getItem('k', 5)).toBe(50);
  });

  it('clamps on read when stored value is NaN', () => {
    const base = makeBase();
    base.setItem('k', Number.NaN);
    const storage = createClampedNumberJSONStorage(base, { min: 1, max: 60, writeFallback: 30 });
    expect(storage.getItem('k', 30)).toBe(30);
  });

  it('clamps on write and persists coerced value', () => {
    const base = makeBase();
    const storage = createClampedNumberJSONStorage(base, { min: 0, max: 50, writeFallback: 1 });
    storage.setItem('dex:slippage', 200);
    expect(base.log.at(-1)).toEqual({ key: 'dex:slippage', value: 50 });
    expect(storage.getItem('dex:slippage', 5)).toBe(50);
  });

  it('uses writeFallback when write payload is not finite', () => {
    const base = makeBase();
    const storage = createClampedNumberJSONStorage(base, { min: 0, max: 50, writeFallback: 7 });
    storage.setItem('k', Number.NaN);
    expect(base.log.at(-1)?.value).toBe(7);
  });
});

describe('evictLegacyAex9BalancesCache', () => {
  it('removes legacy wallet:aex9Balances key', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem');
    evictLegacyAex9BalancesCache();
    expect(spy).toHaveBeenCalledWith('wallet:aex9Balances');
  });
});
