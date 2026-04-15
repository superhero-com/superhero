import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '../backend';

describe('SuperheroApi.listPopularPosts', () => {
  const jsonBody = JSON.stringify({ items: [], meta: { currentPage: 1, totalPages: 1, totalItems: 0 } });

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) => {
          if (name === 'content-type') return 'application/json';
          if (name === 'content-length') return String(jsonBody.length);
          return null;
        },
      },
      text: () => Promise.resolve(jsonBody),
    }));
  });

  const getCalledUrl = (): string => {
    const call = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    return call[0] as string;
  };

  it('builds URL with window, page, and limit', async () => {
    await SuperheroApi.listPopularPosts({ window: '7d', page: 2, limit: 20 });
    const url = getCalledUrl();
    expect(url).toContain('window=7d');
    expect(url).toContain('page=2');
    expect(url).toContain('limit=20');
  });

  it('builds URL without weights when none provided', async () => {
    await SuperheroApi.listPopularPosts({ window: '24h', page: 1, limit: 10 });
    const url = getCalledUrl();
    expect(url).toContain('window=24h');
    expect(url).not.toContain('comments');
    expect(url).not.toContain('reads');
  });

  it('appends weight params to URL', async () => {
    await SuperheroApi.listPopularPosts({
      window: '24h',
      page: 1,
      limit: 10,
      weights: { comments: 'high', reads: 'low' },
    });
    const url = getCalledUrl();
    expect(url).toContain('comments=high');
    expect(url).toContain('reads=low');
  });

  it('appends all weight keys when provided', async () => {
    await SuperheroApi.listPopularPosts({
      window: 'all',
      page: 1,
      limit: 10,
      weights: {
        comments: 'high',
        tipsAmountAE: 'low',
        tipsCount: 'med',
        uniqueTippers: 'high',
        trendingBoost: 'low',
        contentQuality: 'med',
        reads: 'high',
        interactionsPerHour: 'low',
      },
    });
    const url = getCalledUrl();
    expect(url).toContain('comments=high');
    expect(url).toContain('tipsAmountAE=low');
    expect(url).toContain('tipsCount=med');
    expect(url).toContain('uniqueTippers=high');
    expect(url).toContain('trendingBoost=low');
    expect(url).toContain('contentQuality=med');
    expect(url).toContain('reads=high');
    expect(url).toContain('interactionsPerHour=low');
  });

  it('skips undefined weight values', async () => {
    await SuperheroApi.listPopularPosts({
      window: '24h',
      page: 1,
      limit: 10,
      weights: { comments: 'high' },
    });
    const url = getCalledUrl();
    expect(url).toContain('comments=high');
    expect(url).not.toContain('reads=');
    expect(url).not.toContain('tipsCount=');
  });

  it('does not append weights when weights is undefined', async () => {
    await SuperheroApi.listPopularPosts({
      window: '24h',
      page: 1,
      limit: 10,
      weights: undefined,
    });
    const url = getCalledUrl();
    const params = new URL(url).searchParams;
    expect([...params.keys()]).toEqual(['window', 'page', 'limit']);
  });

  it('does not append weights when weights is empty object', async () => {
    await SuperheroApi.listPopularPosts({
      window: '24h',
      page: 1,
      limit: 10,
      weights: {},
    });
    const url = getCalledUrl();
    const params = new URL(url).searchParams;
    expect([...params.keys()]).toEqual(['window', 'page', 'limit']);
  });
});
