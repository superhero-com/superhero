import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import WalletOverviewCard from '../WalletOverviewCard';

const sdk = vi.hoisted(() => ({ activeAccount: undefined as string | undefined }));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: sdk.activeAccount, currentBlockHeight: 1234567 }),
}));
vi.mock('@/hooks/useAccountBalances', () => ({
  useAccountBalances: () => ({ decimalBalance: { toString: () => '5' } }),
}));
vi.mock('@/hooks/useChainName', () => ({ useChainName: () => ({ chainName: '' }) }));
vi.mock('@/components/AddressAvatar', () => ({ default: () => null }));
vi.mock('@/api/generated/services/AccountTokensService', () => ({
  AccountTokensService: { listTokenHolders: () => Promise.resolve({ items: [] }) },
}));

const renderCard = () => render(
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>
      <WalletOverviewCard selectedCurrency="usd" prices={{ usd: 0.05 }} />
    </MemoryRouter>
  </QueryClientProvider>,
);

describe('WalletOverviewCard', () => {
  beforeEach(() => { sdk.activeAccount = undefined; });

  it('shows the AE price to guests', () => {
    renderCard();
    expect(screen.getByRole('region', { name: 'AE Price' })).toHaveTextContent('$0.05');
    expect(screen.queryByText('Your Wallet')).not.toBeInTheDocument();
  });

  it('keeps the AE price card after login, with the wallet under it (#735)', () => {
    sdk.activeAccount = 'ak_signedIn';
    renderCard();
    const price = screen.getByRole('region', { name: 'AE Price' });
    const wallet = screen.getByText('Your Wallet');
    expect(price).toHaveTextContent('$0.05');
    // Two cards, price first: the wallet card is the next card, not nested in it.
    expect(price).not.toContainElement(wallet);
    expect(price.nextElementSibling).toContainElement(wallet);
  });
});
