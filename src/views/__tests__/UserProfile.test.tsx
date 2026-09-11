import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import UserProfile from '../UserProfile';

const mocks = vi.hoisted(() => ({
  resolution: { address: null as string | null, isLoading: true },
  posts: vi.fn(),
  account: vi.fn(),
  balances: vi.fn(),
  resolveName: vi.fn(),
}));
vi.mock('@/hooks/useChainName', () => ({
  useAddressByChainName: (name: string) => {
    mocks.resolveName(name);
    return mocks.resolution;
  },
  useChainName: () => ({ chainName: 'alice.chain' }),
}));
vi.mock('@/hooks/useAccountBalances', () => ({
  useAccountBalances: (address: string) => {
    mocks.balances(address);
    return { decimalBalance: { prettify: () => '0', toNumber: () => 0 }, aex9Balances: [] };
  },
}));
vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ canEdit: false }) }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({}) }));
vi.mock('@/hooks', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('@/api/generated', () => ({ PostsService: { listAll: mocks.posts } }));
vi.mock('@/api/generated/services/AccountsService', () => ({ AccountsService: { getAccount: mocks.account } }));
vi.mock('@/api/generated/services/AccountTokensService', () => ({
  AccountTokensService: { listTokenHolders: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/api/generated/services/TokensService', () => ({
  TokensService: { listAll: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/api/generated/services/TransactionsService', () => ({
  TransactionsService: { listTransactions: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/api/backend', () => ({
  getLinkedBio: () => '',
  getLinkedPreferredAensName: () => '',
  getLinkedXUsername: () => '',
  isXLinked: () => false,
  patchAccountCacheEntry: vi.fn(),
  SuperheroApi: { listTokens: vi.fn().mockResolvedValue({ items: [] }) },
}));
vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountCreatedToken', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountFeed', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountOwnedTokens', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountTrades', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountPortfolio', () => ({ default: () => null }));
vi.mock('@/components/modals/ProfileEditModal', () => ({ default: () => null }));
vi.mock('@/components/layout/RightRail', () => ({ default: () => null }));
vi.mock('@/components/layout/Shell', () => ({ default: ({ children }: any) => children }));
vi.mock('@/seo/Head', () => ({ default: () => null }));

function renderProfile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const tree = () => (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/users/Alice.Chain']}>
        <Routes>
          <Route path="/users/:address" element={<UserProfile standalone={false} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  const view = render(tree());
  return { client, resolve: () => view.rerender(tree()) };
}

describe('UserProfile chain-name routes', () => {
  beforeEach(() => {
    mocks.resolution = { address: null, isLoading: true };
    mocks.posts.mockResolvedValue({
      items: [{ id: 'one-post' }], meta: { totalItems: 150, totalPages: 15, currentPage: 1 },
    });
    mocks.account.mockResolvedValue({ public_name: 'Alice', holdings_count: 0 });
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  });

  it('waits for a case-insensitive chain name to resolve before loading account data or enabling tips', async () => {
    const view = renderProfile();
    expect(mocks.resolveName).toHaveBeenCalledWith('Alice.Chain');
    expect(mocks.posts).not.toHaveBeenCalled();
    expect(mocks.account).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Tip' })).not.toBeInTheDocument();

    mocks.resolution = { address: 'ak_alice', isLoading: false };
    view.resolve();

    await waitFor(() => expect(mocks.posts).toHaveBeenCalledWith(expect.objectContaining({
      accountAddress: 'ak_alice', limit: 100,
    })));
    expect(mocks.posts.mock.calls.every(([request]) => request.accountAddress === 'ak_alice')).toBe(true);
    expect(mocks.account).toHaveBeenCalledWith({ address: 'ak_alice' });
    await screen.findByText('150');
    expect(view.client.getQueryData(['PostsService.listAll', 'ak_alice'])).toBeDefined();
    expect(screen.getByRole('button', { name: 'Tip' })).toBeInTheDocument();
  });

  it('keeps unresolved names out of account and transaction actions', () => {
    mocks.resolution = { address: null, isLoading: false };
    renderProfile();
    expect(screen.getByRole('status')).toHaveTextContent("The page you're looking for doesn't exist.");
    expect(screen.queryByRole('button', { name: 'Tip' })).not.toBeInTheDocument();
    expect(mocks.posts).not.toHaveBeenCalled();
    expect(mocks.account).not.toHaveBeenCalled();
    expect(mocks.balances).not.toHaveBeenCalledWith('Alice.Chain');
  });
});
