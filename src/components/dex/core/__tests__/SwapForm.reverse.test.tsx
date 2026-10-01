import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { DexTokenDto } from '../../../../api/generated';
import SwapForm from '../SwapForm';

const ae = {
  address: 'AE', symbol: 'AE', decimals: 18, is_ae: true,
} as unknown as DexTokenDto;
const out = { address: 'ct_out', symbol: 'OUT', decimals: 18 } as DexTokenDto;

// What the router quotes for the next request; undefined = the quote never answers.
const quote = vi.hoisted(() => ({ amountOut: undefined as string | undefined }));

vi.mock('../../../../hooks', () => ({
  useAccount: () => ({ activeAccount: 'ak_trader' }),
  useDex: () => ({ slippagePct: 1, deadlineMins: 30 }),
}));
vi.mock('../../hooks/useTokenList', () => ({ useTokenList: () => ({ tokens: [ae, out], loading: false }) }));
vi.mock('../../hooks/useTokenBalances', () => ({ useTokenBalances: () => ({ balances: { in: '100', out: '100' } }) }));
vi.mock('../../hooks/useSwapExecution', () => ({
  useSwapExecution: () => ({ loading: false, swapStep: null, executeSwap: vi.fn() }),
}));
vi.mock('../../hooks/useSwapQuote', () => ({
  useSwapQuote: () => ({
    quoteLoading: false,
    error: null,
    routeInfo: { path: ['AE', 'ct_out'] },
    debouncedQuote: (params: { amountIn: string }, onResult: (r: unknown) => void) => {
      if (params.amountIn && quote.amountOut) onResult({ amountOut: quote.amountOut, path: ['AE', 'ct_out'] });
    },
    cancelDebouncedQuote: vi.fn(),
  }),
}));
vi.mock('../../../../api/generated', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  DexPairService: { getPairByFromTokenAndToToken: () => Promise.resolve(null) },
}));
vi.mock('../TokenSelector', () => ({ default: () => <button type="button">Choose token</button> }));

const renderSwap = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter initialEntries={['/defi/swap?from=AE&to=ct_out']}>
      <SwapForm />
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('reversing the swap direction', () => {
  beforeEach(() => { quote.amountOut = undefined; });

  it('keeps the amount the trader typed when there is no quote to carry over', async () => {
    renderSwap();
    const pay = await screen.findByLabelText(/You pay/);
    fireEvent.change(pay, { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reverse tokens' }));
    expect(screen.getByLabelText(/You pay/)).toHaveValue('5');
  });

  it('carries the quoted receive amount over to the pay side', async () => {
    quote.amountOut = '12';
    renderSwap();
    const pay = await screen.findByLabelText(/You pay/);
    fireEvent.change(pay, { target: { value: '5' } });
    // The receive field shows the quote formatted; its title holds the raw amount.
    expect(screen.getByLabelText(/You receive/)).toHaveAttribute('title', '12');
    fireEvent.click(screen.getByRole('button', { name: 'Reverse tokens' }));
    expect(screen.getByLabelText(/You pay/)).toHaveValue('12');
  });
});
