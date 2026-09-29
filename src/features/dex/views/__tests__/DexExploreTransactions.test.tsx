import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import DexExploreTransactions from '../DexExploreTransactions';

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock('../../../../api/generated', () => ({
  DexService: { listAllPairTransactions: mocks.list },
}));
vi.mock('../../components/TransactionCard', () => ({
  TransactionCard: ({ transaction }: { transaction: { tx_hash: string } }) => (
    <article>{transaction.tx_hash}</article>
  ),
}));
const transaction = { tx_hash: 'th_sample', pair: { token0: { address: 'ct_wae', symbol: 'WAE' }, token1: { address: 'ct_wtt', symbol: 'WTT' } } };
const data = {
  items: [transaction],
  meta: {
    totalItems: 32, currentPage: 1, totalPages: 4, itemsPerPage: 10, itemCount: 1,
  },
};
const RouteControls = () => {
  const location = useLocation(); const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current route">{location.search}</output>
      <button type="button" onClick={() => navigate('?tokenAddress=ct_wtt&keep=1')}>Other token</button>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
    </>
  );
};
const setup = (url = '/defi/explore/transactions') => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[url]}>
      <DexExploreTransactions />
      <RouteControls />
    </MemoryRouter>
  </QueryClientProvider>,
);
const ready = () => screen.findByText('th_sample');
const request = async (params: object) => waitFor(() => expect(mocks.list)
  .toHaveBeenLastCalledWith(expect.objectContaining(params)));
const changeType = (value: string) => fireEvent.change(screen.getByRole('combobox', { name: 'Transaction type' }), { target: { value } });
const expand = () => fireEvent.click(screen.getByRole('button', { name: /Address filters/ }));
beforeEach(() => mocks.list.mockReset().mockResolvedValue(data));

describe('DeFi transaction explorer controls', () => {
  it('loads newest first, retains all exact method choices and shows the server total', async () => {
    setup(); await ready();
    await request({
      orderBy: 'created_at', orderDirection: 'DESC', limit: 10, page: 1, txType: undefined,
    });
    expect(screen.getByText('32 transactions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Address filters' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Pool address' })).not.toBeInTheDocument();
    const select = screen.getByRole('combobox', { name: 'Transaction type' }) as HTMLSelectElement;
    expect([...select.options].map((option) => option.value)).toEqual([
      'all', 'swap_exact_ae_for_tokens', 'swap_ae_for_exact_tokens', 'swap_exact_tokens_for_ae',
      'swap_tokens_for_exact_ae', 'swap_exact_tokens_for_tokens', 'swap_tokens_for_exact_tokens',
      'add_liquidity_ae', 'add_liquidity', 'remove_liquidity_ae', 'remove_liquidity',
    ]);
  });

  it('applies trimmed pool/wallet drafts together and resets pagination', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await request({ page: 2 });
    expand(); const calls = mocks.list.mock.calls.length;
    fireEvent.change(screen.getByRole('textbox', { name: 'Pool address' }), { target: { value: '  ct_pool  ' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Wallet address' }), { target: { value: ' ak_wallet ' } });
    expect(mocks.list).toHaveBeenCalledTimes(calls);
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await request({ page: 1, pairAddress: 'ct_pool', accountAddress: 'ak_wallet' });
    expect(screen.getByRole('button', { name: 'Address filters 2' })).toBeInTheDocument();
    expect(screen.getByText('ct_pool')).toBeInTheDocument();
  });

  it('resets sorting/type to page one and forwards exact API values', async () => {
    setup(); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Last page' })); await request({ page: 4 });
    changeType('swap_tokens_for_exact_tokens');
    await request({ page: 1, txType: 'swap_tokens_for_exact_tokens' });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await request({ page: 2 });
    fireEvent.change(screen.getByRole('combobox', { name: 'Transaction order' }), { target: { value: 'ASC' } });
    await request({ page: 1, orderDirection: 'ASC', txType: 'swap_tokens_for_exact_tokens' });
  });

  it('removes one address filter without erasing the other', async () => {
    setup(); await ready(); expand();
    fireEvent.change(screen.getByRole('textbox', { name: 'Pool address' }), { target: { value: 'ct_pool' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Wallet address' }), { target: { value: 'ak_wallet' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }));
    await request({ pairAddress: 'ct_pool' });
    fireEvent.click(screen.getByRole('button', { name: 'Remove pool filter' }));
    await request({ pairAddress: undefined, accountAddress: 'ak_wallet' });
    expect(screen.getByRole('textbox', { name: 'Pool address' })).toHaveValue('');
    expand(); expect(screen.getByRole('button', { name: 'Remove wallet filter' })).toBeVisible();
  });

  it('clears type, address drafts and URL token while preserving unrelated URL params', async () => {
    setup('/defi/explore/transactions?tokenAddress=ct_wae&keep=1'); await ready(); expand();
    expect(screen.getByText('WAE')).toBeInTheDocument();
    changeType('add_liquidity'); await request({ txType: 'add_liquidity' });
    fireEvent.change(screen.getByRole('textbox', { name: 'Wallet address' }), { target: { value: 'ak_draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    await request({
      tokenAddress: undefined,
      txType: undefined,
      pairAddress: undefined,
      accountAddress: undefined,
      page: 1,
    });
    expect(screen.getByLabelText('Current route')).toHaveTextContent('?keep=1');
    expect(screen.getByRole('textbox', { name: 'Wallet address' })).toHaveValue('');
  });

  it('resets to page one on URL filter changes and browser back', async () => {
    setup('/defi/explore/transactions?tokenAddress=ct_wae&keep=1'); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await request({ page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Other token' })); await request({ tokenAddress: 'ct_wtt', page: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' })); await request({ page: 2 });
    fireEvent.click(screen.getByRole('button', { name: 'Back' })); await request({ tokenAddress: 'ct_wae', page: 1 });
    const firstTokenRequest = mocks.list.mock.calls.find(([args]) => args.tokenAddress === 'ct_wtt');
    expect(firstTokenRequest?.[0].page).toBe(1);
  });

  it('keeps controls usable and hides unrelated old results during loading, then allows retry', async () => {
    setup(); await ready();
    mocks.list.mockImplementationOnce(() => new Promise(() => {}));
    changeType('remove_liquidity');
    await request({ txType: 'remove_liquidity' });
    expect(screen.queryByText('th_sample')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Transaction type' })).toBeEnabled();
    mocks.list.mockRejectedValueOnce(new Error('Unavailable'));
    changeType('remove_liquidity_ae');
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t load transactions');
    expect(screen.queryByText('No matching transactions')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' })); await ready();
    await request({ txType: 'remove_liquidity_ae' });
  });

  it('shows a full unresolved token filter and truthful empty results', async () => {
    mocks.list.mockResolvedValue({
      items: [], meta: { ...data.meta, totalItems: 0, totalPages: 0 },
    });
    setup('/defi/explore/transactions?tokenAddress=ct_full_unknown_address');
    expect(await screen.findByText('No matching transactions')).toBeInTheDocument();
    expect(screen.getByText('0 transactions')).toBeInTheDocument();
    expect(screen.getByText('ct_full_unknown_address')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove token filter' }));
    await request({ tokenAddress: undefined });
  });
});
