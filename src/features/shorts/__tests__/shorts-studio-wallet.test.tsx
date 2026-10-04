import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import { ShortsStudio } from '../shorts-studio';

vi.mock('@/components/layout/app-header/HeaderWalletButton', () => ({
  default: () => <button type="button">Shared wallet account menu</button>,
}));
vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Shared connect dialog</button> }));

describe('Studio main-wallet identity', () => {
  it('shows the connected account without redundant sign-in or switch-wallet buttons', () => {
    const signIn = vi.fn();
    render(
      <MemoryRouter initialEntries={['/shorts/studio']}>
        <ShortsStudio s={{
          actor: 'ak_existing_home_wallet', authenticated: false, busy: false, signIn,
        } as unknown as Parameters<typeof ShortsStudio>[0]['s']}
        />
      </MemoryRouter>,
    );
    const sidebar = screen.getByRole('complementary');
    expect(within(sidebar).getByRole('button', { name: 'Shared wallet account menu' })).toBeVisible();
    expect(within(sidebar).queryByTestId('profile-address-chip')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Testnet preview')).not.toBeInTheDocument();
    expect(within(screen.getByRole('main')).queryByRole('button', { name: 'Shared wallet account menu' })).not.toBeInTheDocument();
    expect(screen.queryByText('Connected to Superhero')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Shared wallet account menu' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Sign in|Switch wallet|Reconnect/i })).not.toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Unlock creator tools' }));
    expect(signIn).toHaveBeenCalledOnce();
  });
});
