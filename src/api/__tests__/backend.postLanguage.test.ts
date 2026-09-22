import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '../backend';

afterEach(() => vi.restoreAllMocks());

describe.each(['listPosts', 'listPopularPosts'] as const)('%s language contract', (method) => {
  it.each(['en', 'zh', 'ar', 'ru'] as const)('forwards %s and preserves matching posts and pagination', async (language) => {
    const response = { items: [{ id: 'p1', language }], meta: { currentPage: 2, totalPages: 3 } };
    const request = vi.spyOn(SuperheroApi, 'fetchJson').mockResolvedValue(response);
    expect(await SuperheroApi[method]({ page: 2, limit: 10, language })).toBe(response);
    const url = new URL(request.mock.calls[0][0], 'https://example.test');
    expect(url.searchParams.get('language')).toBe(language);
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('omits the filter for All and accepts untagged posts', async () => {
    const response = { items: [{ id: 'old-post' }] };
    const request = vi.spyOn(SuperheroApi, 'fetchJson').mockResolvedValue(response);
    expect(await SuperheroApi[method]({})).toBe(response);
    expect(request.mock.calls[0][0]).not.toContain('language=');
  });

  it.each([undefined, null, 'und', 'en'])('rejects unfiltered responses (%s) instead of displaying them as Arabic', async (language) => {
    vi.spyOn(SuperheroApi, 'fetchJson').mockResolvedValue({ items: [{ id: 'p1', language }] });
    await expect(SuperheroApi[method]({ language: 'ar' })).rejects.toThrow('Post language filtering is unavailable');
  });
});
