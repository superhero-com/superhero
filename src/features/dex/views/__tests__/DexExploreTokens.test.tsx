import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import DexExploreTokens from '../DexExploreTokens';

const mocks = vi.hoisted(() => ({ list: vi.fn(), table: vi.fn(), cards: vi.fn() }));
vi.mock('../../../../api/generated', () => ({ DexService: { listAllDexTokens: mocks.list } }));
vi.mock('../../../../components/explore/components/TokenListTable', () => ({
  TokenListTable: (props: unknown) => { mocks.table(props); return <div>Token table</div>; },
}));
vi.mock('../../../../components/explore/components/TokenListCards', () => ({
  TokenListCards: (props: unknown) => { mocks.cards(props); return <div>Token cards</div>; },
}));
const data = {
  items: [{ address: 'ct_example', symbol: 'WAE' }],
  meta: { totalItems: 32, currentPage: 1, totalPages: 4 },
};
const setup = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <DexExploreTokens />
  </QueryClientProvider>,
);
const ready = () => screen.findByText('Token table');
beforeEach(() => {
  mocks.list.mockReset().mockResolvedValue(data);
  mocks.table.mockClear();
  mocks.cards.mockClear();
});

describe('DeFi token explorer controls', () => {
  it('defaults to descending 30d volume, with one toolbar and the API total', async () => {
    setup();
    await ready();
    expect(mocks.list).toHaveBeenLastCalledWith({
      page: 1, limit: 10, orderBy: '30dvolume', orderDirection: 'DESC', search: '',
    });
    expect(screen.getByRole('status')).toHaveTextContent('32 tokens');
    expect(screen.getAllByRole('searchbox')).toHaveLength(1);
    expect(mocks.table).toHaveBeenLastCalledWith(expect.objectContaining({ hideControls: true, timeframe: '30d' }));
    expect(mocks.cards).toHaveBeenLastCalledWith(expect.objectContaining({ hideControls: true, timeframe: '30d' }));
  });

  it('resets search to page one and clears it with Escape, retaining focus', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
    ));
    const search = screen.getByRole('searchbox');
    fireEvent.change(search, { target: { value: 'WAE' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, search: 'WAE' })));
    fireEvent.keyDown(search, { key: 'Escape' });
    expect(search).toHaveValue(''); expect(search).toHaveFocus();
  });

  it('aligns period-based API sorting and displayed periods, including mobile selection', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: '7dvolume' })));
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort tokens by' }), { target: { value: 'change' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: '7dchange' })));
    fireEvent.change(screen.getByRole('combobox', { name: 'Performance period' }), { target: { value: '24h' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: '24hchange' })));
    await waitFor(() => expect(mocks.table).toHaveBeenLastCalledWith(expect.objectContaining({ timeframe: '24h' })));
    expect(screen.getByRole('button', { name: '24h' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('resets pages on sorting changes and retains non-period sorting across periods', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: /Next/ })); await ready();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort tokens by' }), { target: { value: 'name' } });
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, orderBy: 'name', orderDirection: 'ASC' })));
    fireEvent.click(screen.getByRole('button', { name: 'A to Z. Reverse sort order' }));
    await waitFor(() => expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ orderBy: 'name', orderDirection: 'DESC' })));
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByRole('combobox', { name: 'Sort tokens by' })).toHaveValue('name');
    await waitFor(() => expect(mocks.cards).toHaveBeenLastCalledWith(expect.objectContaining({ timeframe: '7d' })));
  });

  it('keeps controls while loading and distinguishes errors from empty results', async () => {
    mocks.list.mockImplementationOnce(() => new Promise(() => {}));
    setup();
    expect(screen.getByRole('searchbox')).toBeEnabled();
    expect(screen.getByRole('combobox', { name: 'Sort tokens by' })).toBeEnabled();
    mocks.list.mockRejectedValueOnce(new Error('Unavailable'));
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'failure' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load tokens');
    expect(screen.queryByText('No matching tokens')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await ready();
    expect(mocks.list).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'failure' }));
  });

  it('shows an honest empty result with a way to clear the current search', async () => {
    setup(); await ready();
    mocks.list.mockResolvedValueOnce({
      items: [], meta: { totalItems: 0, currentPage: 1, totalPages: 0 },
    });
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'missing' } });
    expect(await screen.findByText('No matching tokens')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('0 tokens');
    expect(screen.queryByRole('button', { name: /Next/ })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
    await ready();
    expect(screen.getByRole('searchbox')).toHaveValue('');
  });
});
