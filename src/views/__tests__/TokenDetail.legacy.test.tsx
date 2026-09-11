import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import TokenDetail from '../TokenDetail';

const { getToken, getSummary } = vi.hoisted(() => ({
  getToken: vi.fn(() => new Promise(() => {})),
  getSummary: vi.fn(() => new Promise(() => {})),
}));
vi.mock('@/api/generated', () => ({ DexService: { getDexTokenByAddress: getSummary } }));
vi.mock('@/libs/dexBackend', () => ({ getTokenWithUsd: getToken }));
vi.mock('@/hooks', () => ({ useAeSdk: () => ({ activeNetwork: { middlewareUrl: 'https://middleware.example' } }) }));
vi.mock('@/features/dex/components', () => ({ TokenPricePerformance: () => null }));
vi.mock('@/features/shared/components', () => ({ PriceDataFormatter: () => null }));

describe('DEX token detail routes', () => {
  it.each(['/explore/tokens/:id', '/defi/explore/tokens/:tokenAddress'])('loads the token address for %s', async (path) => {
    const address = 'ct_token';
    getToken.mockClear();
    getSummary.mockClear();
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[path.replace(/:[^/]+$/, address)]}>
          <Routes><Route path={path} element={<TokenDetail />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await waitFor(() => expect(getToken).toHaveBeenCalledWith(address));
    expect(getSummary).toHaveBeenCalledWith({ address });
    expect(fetch).toHaveBeenCalledWith(`https://middleware.example/v3/aex9/${address}`);
  });
});
