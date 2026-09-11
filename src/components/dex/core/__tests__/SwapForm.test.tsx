import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SwapForm from '../SwapForm';

const mocks = vi.hoisted(() => ({
  tokens: [
    {
      address: 'AE', symbol: 'AE', decimals: 18, is_ae: true,
    },
    { address: 'ct_first', symbol: 'FIRST', decimals: 18 },
    { address: 'ct_second', symbol: 'SECOND', decimals: 18 },
  ],
  lookup: vi.fn(),
  quote: {
    quoteLoading: false,
    error: null as string | null,
    routeInfo: { path: ['ct_first', 'ct_second'], routerAmountOut: '20' },
    debouncedQuote: (_params: any, callback: any) => callback({ amountOut: '20', path: ['ct_first', 'ct_second'] }),
  },
}));

vi.mock('../../../../hooks', () => ({
  useAccount: () => ({ activeAccount: 'ak_wallet' }),
  useDex: () => ({ slippagePct: 1, deadlineMins: 20 }),
}));
vi.mock('../../hooks/useTokenList', () => ({ useTokenList: () => ({ tokens: mocks.tokens, loading: false }) }));
vi.mock('../../hooks/useTokenBalances', () => ({ useTokenBalances: () => ({ balances: { in: '1000', out: '1000' } }) }));
vi.mock('../../hooks/useSwapQuote', () => ({ useSwapQuote: () => mocks.quote }));
vi.mock('../../hooks/useSwapExecution', () => ({ useSwapExecution: () => ({ loading: false, executeSwap: vi.fn() }) }));
vi.mock('../../../../api/generated', () => ({
  DexPairService: { getPairByFromTokenAndToToken: async () => null },
  DexService: { getDexTokenByAddress: (...args: any[]) => mocks.lookup(...args) },
}));
vi.mock('../../../../features/dex/components/DexSettings', () => ({ default: ({ children }: any) => children }));
vi.mock('../../../ConnectWalletButton', () => ({ default: () => null }));
vi.mock('../SwapConfirmation', () => ({ default: () => null }));
vi.mock('../SwapInfoDisplay', () => ({ default: () => null }));
vi.mock('../NoLiquidityWarning', () => ({ default: () => null }));
vi.mock('../TokenInput', () => ({
  default: ({
    label, token, amount, onAmountChange,
  }: any) => (
    <div>
      <span data-testid={`token-${label}`}>{token?.symbol || 'none'}</span>
      <input
        aria-label={label}
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
      />
    </div>
  ),
}));

const LocationControls = () => {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <span data-testid="location">{location.search}</span>
      <button type="button" onClick={() => navigate('/defi/swap?from=ct_second&to=ct_first')}>Navigate to another pair</button>
    </>
  );
};

function renderForm(url: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <LocationControls />
        <SwapForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('SwapForm pair navigation and execution guard', () => {
  beforeEach(() => {
    mocks.quote.quoteLoading = false;
    mocks.quote.error = null;
  });

  it('preserves both deep-link tokens while remote metadata loads', async () => {
    let resolveOutput!: (value: any) => void;
    mocks.lookup.mockImplementation(({ address }) => (address === 'ct_remote_in'
      ? Promise.resolve({ address, symbol: 'REMOTE_IN', decimals: 18 })
      : new Promise((resolve) => { resolveOutput = resolve; })));
    renderForm('/defi/swap?from=ct_remote_in&to=ct_remote_out');
    await waitFor(() => expect(mocks.lookup).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('location')).toHaveTextContent('to=ct_remote_out');
    resolveOutput({ address: 'ct_remote_out', symbol: 'REMOTE_OUT', decimals: 18 });
    await waitFor(() => expect(screen.getByTestId('token-To')).toHaveTextContent('REMOTE_OUT'));
    expect(screen.getByTestId('token-From')).toHaveTextContent('REMOTE_IN');
    expect(screen.getByTestId('location')).toHaveTextContent('from=ct_remote_in&to=ct_remote_out');
  });

  it('updates selected tokens when navigating to another pair in the same mounted form', async () => {
    renderForm('/defi/swap?from=ct_first&to=ct_second');
    await waitFor(() => expect(screen.getByTestId('token-From')).toHaveTextContent('FIRST'));
    fireEvent.click(screen.getByRole('button', { name: 'Navigate to another pair' }));
    await waitFor(() => expect(screen.getByTestId('token-From')).toHaveTextContent('SECOND'));
    expect(screen.getByTestId('token-To')).toHaveTextContent('FIRST');
  });

  it('handles rejected remote token metadata without rejecting initialization', async () => {
    mocks.lookup.mockRejectedValue(new Error('Token not found'));
    renderForm('/defi/swap?from=ct_missing&to=ct_second');
    await waitFor(() => expect(screen.getByTestId('token-To')).toHaveTextContent('SECOND'));
    expect(screen.getByTestId('token-From')).toHaveTextContent('none');
  });

  it.each(['loading', 'error'])('disables swaps with a previous valid amount while a quote is %s', async (state) => {
    if (state === 'loading') mocks.quote.quoteLoading = true;
    else mocks.quote.error = 'Quote unavailable';
    renderForm('/defi/swap?from=ct_first&to=ct_second');
    await waitFor(() => expect(screen.getByTestId('token-From')).toHaveTextContent('FIRST'));
    fireEvent.change(screen.getByRole('textbox', { name: 'From' }), { target: { value: '10' } });
    const buttons = screen.getAllByRole('button', { name: 'Swap Tokens' });
    expect(buttons.find((button) => button.textContent?.includes('Swap Tokens'))).toBeDisabled();
  });
});
