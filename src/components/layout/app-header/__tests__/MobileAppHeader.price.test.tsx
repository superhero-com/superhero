import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import MobileAppHeader from '../MobileAppHeader';

vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ activeAccount: null }) }));
vi.mock('@/hooks/useWalletConnect', () => ({ useWalletConnect: () => ({ disconnectWallet: vi.fn() }) }));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => null }));
vi.mock('@/components/AddressAvatar', () => ({ default: () => null }));
vi.mock('@/features/notifications', () => ({ NotificationBell: () => null }));

function renderPrice(price: unknown, performance: unknown = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['TokensService.findByAddress', 'AETERNITY'], {
    symbol: 'AETERNITY', price, performance,
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/trends/tokens/AETERNITY']}>
        <MobileAppHeader />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('mobile trend price', () => {
  it('labels the API token price in AE rather than dollars', () => {
    renderPrice('0.000606');
    expect(screen.getByText('0.000606 AE')).toBeInTheDocument();
    expect(screen.queryByText('$0.000606')).not.toBeInTheDocument();
  });

  it.each([null, undefined, '', 'invalid', '-1'])('does not invent a price from %s', (price) => {
    const { container } = renderPrice(price);
    expect(container.textContent).not.toContain(' AE');
    expect(container.textContent).not.toContain('0.00%');
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('preserves a real zero price', () => {
    renderPrice('0');
    expect(screen.getByText('0 AE')).toBeInTheDocument();
  });
});
