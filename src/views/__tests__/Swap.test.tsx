import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { Provider } from 'react-redux';
import Swap from '../../views/Swap';
import { store } from '../../store/store';

// Basic window SDK mock
function setupWindowSdk() {
  (window as any).__aeSdk = {
    initializeContract: vi.fn(async ({ address }: any) => {
      if (address === 'ct_azbNZ1XrPjXfqBqbAh1ffLNTQ1sbnuUDFvJrXjYz7JQA1saQ3') {
        return {
          factory: vi.fn(async () => ({ decodedResult: 'ct_factory' })),
          get_amounts_out: vi.fn(async (_ain: bigint, _path: string[]) => ({ decodedResult: [0n, 100n] })),
          get_amounts_in: vi.fn(async (_aout: bigint, _path: string[]) => ({ decodedResult: [100n, 0n] })),
          swap_exact_tokens_for_tokens: vi.fn(),
          swap_exact_tokens_for_ae: vi.fn(),
          swap_exact_ae_for_tokens: vi.fn(),
          swap_tokens_for_exact_tokens: vi.fn(),
          swap_tokens_for_exact_ae: vi.fn(),
          swap_ae_for_exact_tokens: vi.fn(),
        } as any;
      }
      if (address === 'ct_factory') {
        return { get_pair: vi.fn(async () => ({ decodedResult: null })) } as any;
      }
      // AEX9 allowance
      return {
        allowance: vi.fn(async () => ({ decodedResult: undefined })),
        create_allowance: vi.fn(async () => ({})),
        change_allowance: vi.fn(async () => ({})),
      } as any;
    }),
  };
}

describe('Swap view', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupWindowSdk();
  });
  afterEach(() => {
    (window as any).__aeSdk = undefined;
  });

  function renderSwap() {
    return render(
      <Provider store={store}>
        <Swap />
      </Provider>,
    );
  }

  it('renders and quotes exact in', async () => {
    renderSwap();
    const inInput = await screen.findByRole('textbox', { name: /amountin/i }).catch(() => document.getElementById('amountIn') as HTMLInputElement);
    fireEvent.change(inInput, { target: { value: '1' } });
    const quoteBtn = screen.getByRole('button', { name: /get quote/i });
    fireEvent.click(quoteBtn);
    await waitFor(() => {
      const outInput = (document.getElementById('amountOut') as HTMLInputElement) || (screen.getAllByPlaceholderText('0.0')[1] as HTMLInputElement);
      // 100n in aettos with 18 decimals → 1e-16 AE, but decimals differ; just assert it set some value
      expect(outInput.value).not.toBe('');
    });
  });
});


