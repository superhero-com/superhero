import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Backend } from '../../api/backend';
import * as cfg from '../../config';

describe('Backend API', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds feed URL with params', async () => {
    vi.spyOn(cfg, 'CONFIG', 'get').mockReturnValue({ BACKEND_URL: 'http://test', CONTRACT_V2_ADDRESS: '' } as any);
    const fetchSpy = vi.spyOn(global, 'fetch' as any).mockResolvedValue({ ok: true, json: async () => [] } as any);
    await Backend.getFeed(2, 'latest', 'ak_abc', 'hello world', true, true, true);
    expect(fetchSpy).toHaveBeenCalled();
    const calledUrl = (fetchSpy.mock.calls[0][0] as string);
    expect(calledUrl.startsWith('http://test/tips?')).toBe(true);
    expect(calledUrl).toContain('page=2');
    expect(calledUrl).toContain('ordering=latest');
    expect(calledUrl).toContain('address=ak_abc');
    expect(calledUrl).toContain('search=hello%20world');
    expect(calledUrl).toContain('blacklist=true');
    expect(calledUrl).toContain('contractVersion=v1');
    expect(calledUrl).toContain('contractVersion=v2');
    expect(calledUrl).toContain('contractVersion=v3');
  });

  it('returns mock data in dev when backend missing', async () => {
    vi.spyOn(cfg, 'CONFIG', 'get').mockReturnValue({ BACKEND_URL: '' } as any);
    (import.meta as any).env = { MODE: 'development', VITE_MOCK_BACKEND: 'true' };
    const list = await Backend.getFeed(1, 'latest', null, null, true, true, true);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });
});


