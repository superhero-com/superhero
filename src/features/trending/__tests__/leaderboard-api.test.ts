import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { fetchLeaderboard } from '../api/leaderboard';
import { SuperheroApi } from '../../../api/backend';

vi.mock('../../../api/backend', () => ({
  SuperheroApi: {
    fetchJson: vi.fn(),
  },
}));

describe('leaderboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds correct query params and normalizes meta', async () => {
    const fetchJsonMock = SuperheroApi.fetchJson as any;

    fetchJsonMock.mockResolvedValueOnce({
      items: [{ address: 'ak_test' }],
      meta: {
        page: 2,
        totalItems: 40,
        totalPages: 4,
        window: '7d',
        sortBy: 'pnl',
        sortDir: 'DESC',
      },
    });

    const result = await fetchLeaderboard({
      timeframe: '7d',
      metric: 'pnl',
      page: 2,
      limit: 15,
    });

    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    const calledPath = fetchJsonMock.mock.calls[0][0] as string;
    expect(calledPath).toContain('/api/accounts/leaderboard?');

    const url = new URL(`https://example.com${calledPath}`);
    expect(url.searchParams.get('window')).toBe('7d');
    expect(url.searchParams.get('sortBy')).toBe('pnl');
    expect(url.searchParams.get('sortDir')).toBe('DESC');
    expect(url.searchParams.get('page')).toBe('2');
    expect(url.searchParams.get('limit')).toBe('15');
    expect(url.searchParams.get('points')).toBe('7');

    expect(result).toEqual({
      items: [{ address: 'ak_test' }],
      meta: {
        totalItems: 40,
        totalPages: 4,
        currentPage: 2,
      },
    });
  });

  it('uses recent time filter params for live leaderboard windows', async () => {
    const fetchJsonMock = SuperheroApi.fetchJson as any;

    fetchJsonMock.mockResolvedValueOnce({
      items: [{ address: 'ak_live', volume_usd: 800 }],
      meta: {
        page: 1,
        totalItems: 1,
        totalPages: 1,
        timeFilter: {
          value: 30,
          unit: 'minutes',
          start: '2026-04-28T20:07:00.000Z',
          end: '2026-04-28T20:37:00.000Z',
        },
      },
    });

    const result = await fetchLeaderboard({
      timeframe: '30m',
      metric: 'pnl',
      page: 1,
      limit: 50,
    });

    expect(fetchJsonMock).toHaveBeenCalledTimes(1);
    const calledPath = fetchJsonMock.mock.calls[0][0] as string;
    const url = new URL(`https://example.com${calledPath}`);

    expect(url.searchParams.get('timePeriod')).toBe('30');
    expect(url.searchParams.get('timeUnit')).toBe('minutes');
    expect(url.searchParams.get('sortBy')).toBe('pnl');
    expect(url.searchParams.get('sortDir')).toBe('DESC');
    expect(url.searchParams.get('limit')).toBe('50');
    expect(url.searchParams.has('window')).toBe(false);
    expect(url.searchParams.has('points')).toBe(false);
    expect(result.meta.timeFilter).toEqual({
      value: 30,
      unit: 'minutes',
      start: '2026-04-28T20:07:00.000Z',
      end: '2026-04-28T20:37:00.000Z',
    });
  });

  it('falls back to sensible meta defaults when backend omits meta', async () => {
    const fetchJsonMock = SuperheroApi.fetchJson as any;

    fetchJsonMock.mockResolvedValueOnce({
      items: [{ address: 'ak_other' }],
    });

    const result = await fetchLeaderboard({
      timeframe: 'all',
      metric: 'aum',
    });

    expect(result.items).toHaveLength(1);
    expect(result.meta.currentPage).toBe(1);
    expect(result.meta.totalPages).toBe(1);
    expect(result.meta.totalItems).toBe(1);
  });
});
