import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { PairDto } from '@/api/generated';
import { PoolCandlestickChart } from '../PoolCandlestickChart';

const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  pair: vi.fn(),
  cancel: vi.fn(),
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
vi.mock('@/api/generated', () => ({
  DexPairService: {
    getPairByAddress: (args: unknown) => Object.assign(mocks.pair(args), { cancel: mocks.cancel }),
    getPaginatedHistory: (args: unknown) => {
      const request = mocks.history(args);
      return Object.assign(request, { cancel: mocks.cancel });
    },
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
const pair = {
  token0: {
    address: 'wae', symbol: 'WAE', name: 'Wrapped AE', is_ae: true,
  },
  token1: { address: 'wtt', symbol: 'WTT', name: 'Wrapped Test Token' },
} as PairDto;
const makeRow = (index: number, close = 3) => ({
  timeOpen: new Date(Date.UTC(2026, 8, 29) + index * 3600000).toISOString(),
  quote: {
    open: 2, high: 4, low: 1, close, volume: 12.5, convertedTo: 'ae',
  },
});
let client: QueryClient;
const content = (address: string) => (
  <QueryClientProvider client={client}>
    <PoolCandlestickChart pairAddress={address} fromTokenAddress="wtt" />
  </QueryClientProvider>
);
beforeEach(() => {
  vi.clearAllMocks(); mocks.options = []; mocks.data = [];
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mocks.pair.mockResolvedValue(pair);
  mocks.history.mockResolvedValue([makeRow(0), makeRow(1)]);
});
afterEach(() => client.clear());

describe('pool chart', () => {
  it('flips price bounds without changing volume units or requesting flat AE prices', async () => {
    render(content('pair-one'));
    await screen.findByText('Latest 1h candle');
    expect(mocks.history).toHaveBeenLastCalledWith(expect.objectContaining({ fromToken: 'token0' }));
    expect(screen.getByRole('region', { name: 'WTT price in AE' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Flip chart price units' }));
    expect(screen.getByRole('region', { name: 'AE price in WTT' })).toBeInTheDocument();
    expect(mocks.data.at(-1)).toMatchObject({ high: 1, low: 0.25, close: 1 / 3 });
    expect(screen.getByText('12.5 AE')).toBeInTheDocument();
    expect(mocks.history).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Line chart' }));
    expect(mocks.data.at(-1)).toMatchObject({ value: 1 / 3 });
    fireEvent.click(screen.getByRole('checkbox'));
    expect(mocks.volumeOptions).toHaveBeenLastCalledWith({ visible: false });
    fireEvent.click(screen.getByRole('button', { name: '5m' }));
    await waitFor(() => expect(mocks.history).toHaveBeenLastCalledWith(
      expect.objectContaining({ interval: 300 }),
    ));
    expect(screen.getByRole('link', { name: 'TradingView' })).toBeInTheDocument();
  });
  it('clears the previous pair while new metadata is pending and ignores its late history', async () => {
    let resolveHistory!: (value: unknown[]) => void;
    mocks.history.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve; }));
    const view = render(content('pair-one'));
    await waitFor(() => expect(mocks.history).toHaveBeenCalledTimes(1));
    mocks.pair.mockReturnValueOnce(new Promise(() => {}));
    view.rerender(content('pair-two'));
    expect(screen.queryByRole('region', { name: 'WTT price in AE' })).not.toBeInTheDocument();
    await act(async () => { resolveHistory([makeRow(0)]); });
    expect(screen.queryByText('Latest 1h candle')).not.toBeInTheDocument();
    expect(mocks.data).toHaveLength(0);
    expect(mocks.cancel).toHaveBeenCalled();
  });
  it('coalesces live updates, refreshes on reconnect and cleans up', async () => {
    const view = render(content('pair-one'));
    await screen.findByText('Latest 1h candle');
    mocks.history.mockResolvedValue([makeRow(0, 4)]);
    act(() => { mocks.live?.(); mocks.live?.(); mocks.live?.(); });
    await waitFor(() => expect(mocks.data.at(-1).close).toBe(4), { timeout: 2000 });
    expect(mocks.history).toHaveBeenCalledTimes(2);
    act(() => mocks.reconnect?.());
    await waitFor(() => expect(mocks.history).toHaveBeenCalledTimes(3), { timeout: 2000 });
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalled();
    expect(mocks.removes).toHaveBeenCalled();
  });
  it('distinguishes load failure, empty data and stale data after a refresh failure', async () => {
    mocks.history.mockRejectedValueOnce(new Error('offline'));
    render(content('pair-one'));
    await screen.findByText('Couldn’t load price history');
    mocks.history.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await screen.findByText('No trading history yet');
    fireEvent.click(screen.getByRole('button', { name: 'Refresh chart' }));
    await screen.findByText('Latest 1h candle');
    mocks.history.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh chart' }));
    await screen.findByText('Couldn’t refresh history. Showing the last available data.');
    expect(mocks.data).toHaveLength(2);
  });
  it('loads older history and keeps the viewport when older candles are prepended', async () => {
    mocks.history.mockImplementation(({ page }) => Promise.resolve(page === 1
      ? Array.from({ length: 100 }, (_, index) => makeRow(index + 1)) : [makeRow(0)]));
    render(content('pair-one'));
    await screen.findByText('Latest 1h candle');
    act(() => mocks.range?.());
    await waitFor(() => expect(mocks.data).toHaveLength(101));
    expect(mocks.history).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(mocks.rangeSet).toHaveBeenLastCalledWith({ from: 1, to: 81 });
  });
});
