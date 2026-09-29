import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import DexExplorePools from '../DexExplorePools';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../../../api/generated', () => ({ DexPairService: { listAllPairs: mocks.list } }));
vi.mock('../../../../features/shared/components', () => ({
  PriceDataFormatter: ({ priceData }: { priceData?: { ae: number } }) => <span>{priceData?.ae ?? 'Unavailable'}</span>,
}));
vi.mock('../../../../components/TokenChip', () => ({
  TokenChip: ({ token }: { token: { symbol: string } }) => <span>{token.symbol}</span>,
}));
vi.mock('../../components/charts/PairLineChart', () => ({ PairLineChart: () => <div>Chart</div> }));
const pair = {
  address: 'ct_pair',
  token0: { address: 'ct_wae', symbol: 'WAE' },
  token1: { address: 'ct_wtt', symbol: 'WTT' },
  transactions_count: 25,
  summary: { total_volume: { ae: 123 }, change: { '30d': { volume: { ae: 30 } }, '7d': { volume: { ae: 7 } } } },
};
const data = { items: [pair], meta: { totalItems: 32, currentPage: 1, totalPages: 4 } };
const LocationControls = () => {
  const location = useLocation(); const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current route">
        {location.pathname}
        {location.search}
      </output>
      <button type="button" onClick={() => navigate('?tokenAddress=ct_wtt&keep=1')}>Other token</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
    </>
  );
};
const setup = (url = '/defi/explore/pools') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}>
      <DexExplorePools />
      <LocationControls />
    </MemoryRouter>
  </QueryClientProvider>,
);
const ready = () => screen.findByRole('button', { name: 'Next page' });
const expectRequest = async (params: object) => waitFor(() => expect(mocks.list)
  .toHaveBeenLastCalledWith(expect.objectContaining(params)));
beforeEach(() => { mocks.list.mockReset().mockResolvedValue(data); });

describe('DeFi pool explorer controls', () => {
  it('defaults to descending all-time transactions and uses the API total', async () => {
    setup(); await ready();
    await expectRequest({
      page: 1, limit: 10, orderBy: 'transactions_count', orderDirection: 'DESC', search: '', tokenAddress: undefined,
    });
    expect(screen.getByText('32 pools')).toBeInTheDocument();
    expect(screen.getByText('Sort by · all time')).toBeInTheDocument();
    expect(screen.getAllByText('Total Volume')).toHaveLength(2);
  });

  it('resets search, sorting, direction and page size to page one', async () => {
    setup(); await ready();
    const next = async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      await expectRequest({ page: 2 });
    };
    await next();
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'WTT' } });
    await expectRequest({ page: 1, search: 'WTT' });
    await next();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort pools by' }), { target: { value: 'created_at' } });
    await expectRequest({ page: 1, orderBy: 'created_at', orderDirection: 'DESC' });
    await next();
    fireEvent.click(screen.getByRole('button', { name: 'Newest first. Reverse sort order' }));
    await expectRequest({ page: 1, orderDirection: 'ASC' });
    await next();
    fireEvent.change(screen.getByRole('combobox', { name: 'Pools per page' }), { target: { value: '50' } });
    await expectRequest({ page: 1, limit: 50 });
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    expect(screen.getByRole('searchbox')).toHaveFocus();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });

  it('changes displayed volume without changing sort, pagination or making another request', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await expectRequest({ page: 2 });
    const count = mocks.list.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getAllByText('7')).toHaveLength(2);
    expect(mocks.list).toHaveBeenCalledTimes(count);
    expect(screen.getByRole('combobox', { name: 'Sort pools by' })).toHaveValue('transactions_count');
    fireEvent.change(screen.getByRole('combobox', { name: 'Volume period' }), { target: { value: '24h' } });
    expect(screen.getAllByText('Unavailable')).toHaveLength(2);
  });

  it('makes token context removable while preserving search and unrelated URL parameters', async () => {
    setup('/defi/explore/pools?tokenAddress=ct_wae&keep=1'); await ready();
    expect(screen.getByText('Pools with')).toHaveTextContent('WAE');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'WTT' } });
    await expectRequest({ tokenAddress: 'ct_wae', search: 'WTT' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove token filter' }));
    await expectRequest({ page: 1, tokenAddress: undefined, search: 'WTT' });
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/defi/explore/pools?keep=1');
  });

  it('resets pagination for URL filter changes and back navigation', async () => {
    setup('/defi/explore/pools?tokenAddress=ct_wae&keep=1'); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await expectRequest({ page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Other token' }));
    await expectRequest({ page: 1, tokenAddress: 'ct_wtt' });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await expectRequest({ page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    await expectRequest({ page: 1, tokenAddress: 'ct_wae' });
    expect(mocks.list.mock.calls.filter(([args]) => args.tokenAddress === 'ct_wtt')[0][0].page).toBe(1);
  });

  it('keeps controls available during loading and error, retries without losing filters', async () => {
    mocks.list.mockImplementationOnce(() => new Promise(() => {})); setup();
    expect(screen.getByRole('searchbox')).toBeEnabled();
    mocks.list.mockRejectedValueOnce(new Error('Unavailable'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'WAE' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load pools');
    expect(screen.queryByText('No matching pools')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await ready();
    await expectRequest({ search: 'WAE' });
  });

  it('shows empty filtered results with the full unresolved token address', async () => {
    mocks.list.mockResolvedValue({ items: [], meta: { totalItems: 0 } });
    setup('/defi/explore/pools?tokenAddress=ct_unresolved_full_address');
    expect(await screen.findByText('No matching pools')).toBeInTheDocument();
    expect(screen.getByText('ct_unresolved_full_address')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove token filter' })).toBeEnabled();
  });

  it('handles absent summaries and lets nested token buttons navigate to the actual token', async () => {
    mocks.list.mockResolvedValue({ ...data, items: [{ ...pair, summary: undefined }] });
    setup(); await ready();
    expect(screen.getAllByText('Unavailable')).toHaveLength(4);
    const token = screen.getAllByRole('button', { name: 'WAE' })[0];
    fireEvent.keyDown(token, { key: 'Enter' });
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/defi/explore/pools');
    fireEvent.click(token);
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/defi/explore/tokens/ct_wae');
  });
});
