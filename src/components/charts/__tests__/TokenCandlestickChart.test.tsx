import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import TokenCandlestickChart from '../TokenCandlestickChart';

const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  currency: 'usd',
  rate: 0.04,
  live: undefined as undefined | (() => void),
  reconnect: undefined as undefined | (() => void),
  unsubscribe: vi.fn(),
  disconnect: vi.fn(),
  range: undefined as undefined | (() => void),
  options: [] as any[],
  data: [] as any[],
  removes: vi.fn(),
  volumeOptions: vi.fn(),
  rangeSet: vi.fn(),
}));
vi.mock('@/hooks/useCurrencies', () => ({
  useCurrencies: () => ({ currentCurrencyCode: mocks.currency, currentCurrencyRate: mocks.rate }),
}));
vi.mock('@/api/generated', () => ({
  TransactionHistoricalService: {
    getPaginatedHistory: (args: unknown) => Object.assign(mocks.history(args), { cancel: vi.fn() }),
  },
}));
vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    subscribeForTokenHistories: (_address: string, callback: () => void) => {
      mocks.live = callback;
      return mocks.unsubscribe;
    },
    subscribeForConnection: (callback: () => void) => {
      mocks.reconnect = callback;
      return mocks.disconnect;
    },
  },
}));
vi.mock('lightweight-charts', async (original) => {
  const actual = await original<typeof import('lightweight-charts')>();
  return {
    ...actual,
    createChart: (_element: unknown, options: unknown) => {
      mocks.options.push(options);
      let seriesCount = 0;
      const scale = {
        setVisibleLogicalRange: mocks.rangeSet,
        fitContent: vi.fn(),
        getVisibleLogicalRange: () => ({ from: 0, to: 80 }),
        subscribeVisibleLogicalRangeChange: (callback: () => void) => {
          mocks.range = callback;
        },
        unsubscribeVisibleLogicalRangeChange: vi.fn(),
      };
      return {
        addSeries: () => {
          seriesCount += 1;
          const isVolume = seriesCount === 2;
          return {
            setData: (values: any[]) => { if (!isVolume) mocks.data = values; },
            data: () => (isVolume ? [] : mocks.data),
            applyOptions: isVolume ? mocks.volumeOptions : vi.fn(),
            priceScale: () => ({ applyOptions: vi.fn() }),
            barsInLogicalRange: () => ({ barsBefore: 0 }),
          };
        },
        timeScale: () => scale,
        subscribeCrosshairMove: vi.fn(),
        unsubscribeCrosshairMove: vi.fn(),
        setCrosshairPosition: vi.fn(),
        clearCrosshairPosition: vi.fn(),
        remove: mocks.removes,
      };
    },
  };
});
const token = { sale_address: 'ct_test', symbol: 'SUPERHERO' } as TokenDto;
const makeRow = (index: number, close = 0.004) => ({
  timeOpen: new Date(Date.UTC(2026, 8, 25) + index * 300000).toISOString(),
  quote: {
    open: '0.003', high: '0.004', low: '0.002', close, volume: 12.5, market_cap: '1000',
  },
});
let client: QueryClient;
const mount = () => render(
  <QueryClientProvider client={client}>
    <TokenCandlestickChart token={token} />
  </QueryClientProvider>,
);
beforeEach(() => {
  vi.clearAllMocks(); mocks.options = []; mocks.data = []; mocks.currency = 'usd';
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.history.mockResolvedValue([makeRow(0), makeRow(1)]);
});
afterEach(() => client.clear());

describe('Token candlestick chart', () => {
  it('uses the selected query interval/currency, retains token volume units and details', async () => {
    mount();
    await screen.findByText('Latest candle');
    fireEvent.click(screen.getByRole('button', { name: 'Candle details' }));
    expect(screen.getByText('Volume · tokens')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1h' }));
    await waitFor(() => expect(mocks.history).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 3600, convertTo: 'ae' })));
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    await waitFor(() => expect(mocks.history).toHaveBeenLastCalledWith(expect.objectContaining({ interval: 3600, convertTo: 'usd' })));
    expect(mocks.history.mock.calls.map(([args]) => [args.interval, args.convertTo])).toEqual([[300, 'ae'], [3600, 'ae'], [3600, 'usd']]);
    expect(mocks.options.every((options) => options.layout.attributionLogo === false)).toBe(true);
    expect(screen.getByRole('link', { name: 'TradingView' })).toBeInTheDocument();
  });
  it('uses AE history and labels current-rate conversion for CNY', async () => {
    mocks.currency = 'cny'; mount();
    await screen.findByText('Latest candle');
    fireEvent.click(screen.getByRole('button', { name: 'CNY' }));
    await screen.findByText('Converted at the current exchange rate.');
    await waitFor(() => expect(mocks.data.at(-1).close).toBeCloseTo(0.00016));
    expect(mocks.history.mock.calls.every(([args]) => args.convertTo === 'ae')).toBe(true);
    expect(mocks.data.at(-1).volume).toBe(12.5);
  });
  it('loads older history and preserves the visible logical range after prepending', async () => {
    mocks.history.mockImplementation(({ page }) => Promise.resolve(page === 1
      ? Array.from({ length: 100 }, (_, index) => makeRow(index + 1)) : [makeRow(0)]));
    mount(); await screen.findByText('Latest candle');
    act(() => mocks.range?.());
    await waitFor(() => expect(mocks.data).toHaveLength(101));
    expect(mocks.history).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(mocks.rangeSet).toHaveBeenLastCalledWith({ from: 1, to: 81 });
  });
  it('coalesces live notifications, refreshes from history, and cleans up subscriptions', async () => {
    const view = mount(); await screen.findByText('Latest candle');
    mocks.history.mockResolvedValue([makeRow(0), makeRow(1, 0.005)]);
    act(() => { mocks.live?.(); mocks.live?.(); mocks.live?.(); });
    await waitFor(() => expect(mocks.data.at(-1).close).toBe(0.005), { timeout: 2000 });
    expect(mocks.history).toHaveBeenCalledTimes(2);
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled(); expect(mocks.disconnect).toHaveBeenCalled();
    expect(mocks.removes).toHaveBeenCalled();
  });
  it('distinguishes empty and error states and retries without fabricated values', async () => {
    mocks.history.mockRejectedValueOnce(new Error('offline'));
    mount(); await screen.findByText('Couldn’t load price history');
    expect(screen.queryByText('Latest candle')).not.toBeInTheDocument();
    mocks.history.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No trading history yet');
    expect(mocks.data).toHaveLength(0);
  });
  it('retains loaded candles if refreshing history fails', async () => {
    mount(); await screen.findByText('Latest candle');
    mocks.history.mockRejectedValue(new Error('offline'));
    act(() => mocks.live?.());
    await screen.findByText('Couldn’t refresh history. Showing the last available data.');
    expect(screen.getByText('Latest candle')).toBeInTheDocument();
    expect(mocks.data).toHaveLength(2);
  });
});
