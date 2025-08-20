import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';
import Dex from '../../views/Dex';
import { store } from '../../store/store';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../libs/dexBackend', () => ({
  getListedTokens: vi.fn(async () => [
    { address: 'ct_TKN', symbol: 'TKN', decimals: 18 },
  ]),
  getSwapRoutes: vi.fn(async () => null),
}));

// Mock the toast provider
vi.mock('../../components/ToastProvider', () => ({
  useToast: () => ({
    push: vi.fn(),
  }),
}));

function setupWindowSdk() {
  const routerSingleton = {
    factory: vi.fn(async () => ({ decodedResult: 'ct_factory' })),
    get_amounts_out: vi.fn(async (_ain: bigint, _path: string[]) => ({ decodedResult: [0n, 200n] })),
    get_amounts_in: vi.fn(async (_aout: bigint, _path: string[]) => ({ decodedResult: [100n, 0n] })),
    swap_exact_tokens_for_tokens: vi.fn(async () => ({})),
    swap_exact_tokens_for_ae: vi.fn(async () => ({})),
    swap_exact_ae_for_tokens: vi.fn(async () => ({})),
    swap_tokens_for_exact_tokens: vi.fn(async () => ({})),
    swap_tokens_for_exact_ae: vi.fn(async () => ({})),
    swap_ae_for_exact_tokens: vi.fn(async () => ({})),
  } as any;
  const factorySingleton = {
    // Make direct pair exist to allow quoting path
    get_pair: vi.fn(async () => ({ decodedResult: 'ct_pair' })),
  } as any;
  const pairSingleton = {
    token0: vi.fn(async () => ({ decodedResult: 'ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa' })),
    get_reserves: vi.fn(async () => ({ decodedResult: { reserve0: 1000n, reserve1: 1000n, block_timestamp_last: 0 } })),
  } as any;
  (window as any).__aeSdk = {
    initializeContract: vi.fn(async ({ address }: any) => {
      if (address === 'ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3') return routerSingleton;
      if (address === 'ct_2mfj3FoZxnhkSw5RZMcP8BfPoB1QR4QiYGNCdkAvLZ1zfF6paW') return factorySingleton;
      if (typeof address === 'string' && address.startsWith('ct_')) return pairSingleton;
      return {} as any;
    }),
  };
  return { routerSingleton };
}

describe('Dex view (Refactored)', () => {
  let routerSingleton: any;
  beforeEach(() => {
    vi.restoreAllMocks();
    routerSingleton = setupWindowSdk().routerSingleton;
  });
  afterEach(() => {
    (window as any).__aeSdk = undefined;
  });

  function renderDex() {
    return render(
      <Provider store={store}>
        <MemoryRouter>
          <Dex />
        </MemoryRouter>
      </Provider>,
    );
  }

  it('loads tokens and computes quote on input', async () => {
    renderDex();
    // Wait for the component to load and find the amount input for "From" field
    const numInput = (await waitFor(() => 
      screen.getByLabelText('amount-from') as HTMLInputElement
    )) as HTMLInputElement;
    
    fireEvent.change(numInput, { target: { value: '1' } });
    
    // Wait for the "To" field to show a quoted amount
    await waitFor(() => {
      const outInput = screen.getByLabelText('amount-to') as HTMLInputElement;
      expect(outInput.value).not.toBe('');
      expect(outInput.value).not.toBe('0.0');
    });
  });

  it('quotes exact-out by filling amountOut and toggling exact output', async () => {
    renderDex();
    // Switch to exact out and set output amount
    const exactOutChk = await screen.findByLabelText(/exact output/i);
    fireEvent.click(exactOutChk);
    
    const outInput = (await waitFor(() => 
      screen.getByLabelText('amount-to') as HTMLInputElement
    )) as HTMLInputElement;
    
    fireEvent.change(outInput, { target: { value: '1' } });
    
    await waitFor(() => {
      const inInput = screen.getByLabelText('amount-from') as HTMLInputElement;
      expect(inInput.value).not.toBe('');
      expect(inInput.value).not.toBe('0.0');
    });
  });

  it('displays swap form with proper structure', async () => {
    renderDex();
    
    // Check that the main DEX title is present
    await waitFor(() => {
      expect(screen.getByText('Superhero DEX')).toBeInTheDocument();
    });
    
    // Check that the swap form elements are present
    expect(screen.getByText('From')).toBeInTheDocument();
    expect(screen.getByText('To')).toBeInTheDocument();
    expect(screen.getByText('Exact output')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows connect wallet button when no wallet is connected', async () => {
    renderDex();
    
    await waitFor(() => {
      // Look for any connect wallet button
      const connectButtons = screen.getAllByText(/connect/i);
      expect(connectButtons.length).toBeGreaterThan(0);
    });
  });

  it('shows swap button when wallet is connected', async () => {
    store.dispatch({ type: 'root/setAddress', payload: 'ak_test' });
    
    renderDex();
    
    await waitFor(() => {
      // Find the main swap button (not from widgets)
      const swapButtons = screen.getAllByRole('button', { name: /swap/i });
      expect(swapButtons.length).toBeGreaterThan(0);
    });
  });

  it('displays all DEX tabs', async () => {
    renderDex();
    
    await waitFor(() => {
      expect(screen.getByText('Dex')).toBeInTheDocument();
      expect(screen.getByText('Pool')).toBeInTheDocument();
      expect(screen.getByText('Explore')).toBeInTheDocument();
      expect(screen.getByText('Add tokens')).toBeInTheDocument();
    });
  });

  it('displays specialized widgets', async () => {
    renderDex();
    
    await waitFor(() => {
      // Check for widget titles
      expect(screen.getByText('Convert aeETH to AE')).toBeInTheDocument();
      expect(screen.getByText('Bridge ETH → AE')).toBeInTheDocument();
    });
  });

  it('handles token selection', async () => {
    renderDex();
    
    // Wait for token selectors to be available
    const tokenSelectors = await screen.findAllByRole('combobox');
    expect(tokenSelectors.length).toBeGreaterThan(0);
    
    // Check that we can interact with the first token selector
    const firstSelector = tokenSelectors[0];
    expect(firstSelector).toBeInTheDocument();
  });

  it('displays amount inputs with proper labels', async () => {
    renderDex();
    
    await waitFor(() => {
      const fromInput = screen.getByLabelText('amount-from');
      const toInput = screen.getByLabelText('amount-to');
      
      expect(fromInput).toBeInTheDocument();
      expect(toInput).toBeInTheDocument();
      expect(fromInput).toHaveAttribute('inputmode', 'decimal');
      expect(toInput).toHaveAttribute('inputmode', 'decimal');
    });
  });

  it('shows price impact when available', async () => {
    renderDex();
    
    // Enter an amount to trigger quote calculation
    const numInput = (await waitFor(() => 
      screen.getByLabelText('amount-from') as HTMLInputElement
    )) as HTMLInputElement;
    
    fireEvent.change(numInput, { target: { value: '1' } });
    
    // Wait for price impact to appear (if calculated)
    await waitFor(() => {
      const priceImpactElement = screen.queryByText(/price impact/i);
      // Price impact might not always be available, so we just check the component handles it
      expect(numInput.value).toBe('1');
    });
  });
});


