import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { SuperheroApi } from '@/api/backend';
import AccountPortfolio from '../AccountPortfolio';

vi.mock('@/api/backend', () => ({ SuperheroApi: { getAccountPortfolioHistory: vi.fn() } }));
vi.mock('recharts', async (importOriginal) => ({
  ...await importOriginal<typeof import('recharts')>(),
  ResponsiveContainer: () => <div data-testid="portfolio-chart" />,
}));

const current = {
  timestamp: '2026-09-20T10:00:00Z',
  total_value_ae: 150,
  total_value_usd: 75,
  ae_balance: 100,
  tokens_value_ae: 50,
  total_pnl: { gain: { ae: -5, usd: -2.5 } },
};
const historyData = [{ ...current, timestamp: '2026-09-19T10:00:00Z', total_value_ae: 120 }];
const request = vi.mocked(SuperheroApi.getAccountPortfolioHistory);
const respond = async (_address: string, params?: { include?: string }) => (
  params?.include ? [current] : historyData
);

const renderPortfolio = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0, gcTime: 0 } } });
  render(<QueryClientProvider client={client}><AccountPortfolio address="ak_test" /></QueryClientProvider>);
  return client;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-20T12:00:00Z'));
  vi.clearAllMocks();
  request.mockImplementation(respond);
});

describe('profile portfolio overview', () => {
  it('shows the balance before history loads, with separately scoped trading P/L', async () => {
    request.mockImplementation((_address, params) => (params?.include
      ? Promise.resolve([current]) : new Promise(() => {})));
    renderPortfolio();
    expect(await screen.findByTestId('portfolio-total')).toHaveTextContent('150.00 AE');
    expect(screen.getByText('-5.00 AE')).toBeVisible();
    expect(screen.getByText('All time')).toBeVisible();
    expect(screen.getByText('Loading portfolio data...')).toBeVisible();
  });

  it('changes currency using the matching fields without refetching or changing allocation units', async () => {
    renderPortfolio();
    await screen.findByTestId('portfolio-total');
    await screen.findByTestId('portfolio-chart');
    const count = request.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('$75.00');
    expect(screen.getByText('-$2.50')).toBeVisible();
    expect(screen.getByText('100.00 AE')).toBeVisible();
    expect(request).toHaveBeenCalledTimes(count);
  });

  it('changes only the historical window and leaves the summary and all-time P/L intact', async () => {
    renderPortfolio();
    await screen.findByTestId('portfolio-chart');
    fireEvent.click(screen.getByRole('button', { name: '1W' }));
    await waitFor(() => expect(request).toHaveBeenCalledWith('ak_test', expect.objectContaining({ interval: 21600 })));
    expect(screen.getByRole('button', { name: '1W' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('150.00 AE');
    expect(request.mock.calls.filter(([, params]) => params?.include === 'pnl')).toHaveLength(1);
  });

  it('shows missing fiat and P/L as unavailable instead of zero or AE amounts', async () => {
    request.mockResolvedValue([{ ...current, total_value_usd: undefined, total_pnl: undefined }]);
    renderPortfolio();
    await screen.findByTestId('portfolio-total');
    fireEvent.click(screen.getByRole('button', { name: 'USD' }));
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('—');
    expect(screen.queryByText('$150.00')).not.toBeInTheDocument();
    expect(screen.queryByText('0.00 AE')).not.toBeInTheDocument();
  });

  it('retains a valid summary when history fails, and retries just the chart', async () => {
    request.mockImplementation(async (_address, params) => {
      if (params?.include) return [current];
      throw new Error('History unavailable');
    });
    renderPortfolio();
    await screen.findByText('Couldn’t load the chart.');
    expect(screen.getByTestId('portfolio-total')).toHaveTextContent('150.00 AE');
    request.mockImplementation(respond);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('portfolio-chart');
    expect(request.mock.calls.filter(([, params]) => params?.include === 'pnl')).toHaveLength(1);
  });

  it('keeps an actual empty portfolio distinct from missing data', async () => {
    request.mockResolvedValue([{
      ...current,
      total_value_ae: 0,
      ae_balance: 0,
      tokens_value_ae: 0,
      total_pnl: { gain: { ae: 0, usd: 0 } },
    }]);
    renderPortfolio();
    expect(await screen.findByTestId('portfolio-total')).toHaveTextContent('0.00 AE');
    expect(await screen.findByText('Not enough history for this period.')).toBeVisible();
  });
});
