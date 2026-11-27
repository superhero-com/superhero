import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import UserProfile from '@/views/UserProfile';

const ADDRESS = 'ak_2bhQHRQCzfgiw5QYnNmoFiza9ZZ4iSQCrEG46pJjZfXRQ7P9x8';

const mockUseAddressByChainName = vi.fn();

vi.mock('@/hooks/useChainName', () => ({
  useAddressByChainName: (name?: string) => mockUseAddressByChainName(name),
  useChainName: () => ({ chainName: undefined }),
}));

vi.mock('@/hooks/usePreferredChainName', () => ({
  usePreferredChainName: () => ({ isPending: false, name: undefined }),
}));

vi.mock('@/hooks/useSocialGraph', () => ({
  useSocialGraphCounts: () => ({ data: undefined, countsStatus: 'idle' }),
}));

vi.mock('@/hooks/useProfile', () => ({ useProfile: () => ({ canEdit: false }) }));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ activeAccount: undefined }) }));
vi.mock('@/hooks', () => ({ useModal: () => ({ openModal: vi.fn() }) }));
vi.mock('@/hooks/useXLinkChanges', () => ({ usePendingXLinkChange: () => null }));
vi.mock('@/hooks/useProfileEditDeepLink', () => ({ useProfileEditDeepLink: () => {} }));

vi.mock('@/features/social/components/ProfileHeaderCard', () => ({
  default: ({ address }: { address: string }) => <div data-testid="profile-header">{address}</div>,
}));
vi.mock('@/components/Account/AccountPortfolio', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountFeed', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountOwnedTokens', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountCreatedToken', () => ({ default: () => null }));
vi.mock('@/components/Account/AccountTrades', () => ({ default: () => null }));
vi.mock('@/components/modals/ProfileEditModal', () => ({ default: () => null }));
vi.mock('@/components/layout/RightRail', () => ({ default: () => null }));
vi.mock('@/seo/Head', () => ({ default: () => null, Head: () => null }));

vi.mock('@/api/generated', () => ({
  PostsService: { listAll: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('@/api/generated/services/AccountsService', () => ({
  AccountsService: { getAccount: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('@/api/generated/services/AccountTokensService', () => ({
  AccountTokensService: { listTokenHolders: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('@/api/generated/services/TokensService', () => ({
  TokensService: { listAll: vi.fn(() => new Promise(() => {})) },
}));
vi.mock('@/api/generated/services/TransactionsService', () => ({
  TransactionsService: { listTransactions: vi.fn(() => new Promise(() => {})) },
}));

function renderAt(param: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/users/${param}`]}>
        <Routes>
          <Route path="/users/:address" element={<UserProfile standalone={false} />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('UserProfile', () => {
  beforeEach(() => {
    mockUseAddressByChainName.mockReset();
    mockUseAddressByChainName.mockReturnValue({ address: null, isLoading: false, notFound: false });
  });

  it('shows the not-found page for a param that is not an account address', () => {
    renderAt('sdsdxxxxxxxzzzzzzzsssssaaaaaa');

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
    expect(screen.queryByTestId('profile-header')).not.toBeInTheDocument();
  });

  it('shows the not-found page for an address with a broken checksum', () => {
    renderAt(`${ADDRESS.slice(0, -1)}1`);

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
  });

  it('shows the profile for a valid account address', () => {
    renderAt(ADDRESS);

    expect(screen.getByTestId('profile-header')).toHaveTextContent(ADDRESS);
    expect(screen.queryByRole('heading', { level: 1, name: '404' })).not.toBeInTheDocument();
  });

  it('shows the not-found page once a .chain name resolves to nobody', () => {
    mockUseAddressByChainName.mockReturnValue({ address: null, isLoading: false, notFound: true });
    renderAt('nobody.chain');

    expect(screen.getByRole('heading', { level: 1, name: '404' })).toBeInTheDocument();
  });

  it('keeps the profile while a .chain name is still resolving', () => {
    mockUseAddressByChainName.mockReturnValue({ address: null, isLoading: true, notFound: false });
    renderAt('someone.chain');

    expect(screen.getByTestId('profile-header')).toBeInTheDocument();
  });

  it('shows the profile of the account a .chain name points to', () => {
    mockUseAddressByChainName.mockReturnValue({
      address: ADDRESS, isLoading: false, notFound: false,
    });
    renderAt('someone.chain');

    expect(screen.getByTestId('profile-header')).toHaveTextContent(ADDRESS);
  });
});
