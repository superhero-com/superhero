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
  it('shows a retryable setup failure instead of an endless skeleton or wallet prompt', () => {
    const refreshNow = vi.fn();
    render(
      <MemoryRouter>
        <ShortsStudio s={{
          section: 'overview',
          actor: 'ak_connected',
          authenticated: false,
          configError: 'Studio settings couldn’t load. Check your connection and try again.',
          refreshNow,
        } as unknown as Parameters<typeof ShortsStudio>[0]['s']}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Studio settings couldn’t load');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Open Studio' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refreshNow).toHaveBeenCalledOnce();
  });
  it('explains a signed session without asking for another wallet connection', () => {
    render(
      <MemoryRouter>
        <ShortsStudio s={{
          section: 'overview',
          actor: 'ak_connected',
          authenticated: false,
          config: { creatorAccess: 'signed-session' },
        } as unknown as Parameters<typeof ShortsStudio>[0]['s']}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Your wallet is connected/)).toHaveTextContent('does not send a transaction or charge a fee');
    expect(screen.queryByText('ak_connected')).not.toBeInTheDocument();
  });
  it('shows the connected account without redundant sign-in or switch-wallet buttons', () => {
    const signIn = vi.fn();
    render(
      <MemoryRouter initialEntries={['/shorts/studio']}>
        <ShortsStudio s={{
          actor: 'ak_existing_home_wallet', authenticated: false, busy: false, signIn,
        } as unknown as unknown as Parameters<typeof ShortsStudio>[0]['s']}
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
    expect(screen.queryByText(/Confirm ownership/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Studio' }));
    expect(signIn).toHaveBeenCalledOnce();
  });
  it('opens the connected creator account without an unlock action', () => {
    const signIn = vi.fn();
    render(
      <MemoryRouter initialEntries={['/shorts/studio']}>
        <ShortsStudio s={{
          actor: 'ak_connected', authenticated: false, restoringCreatorSession: true, busy: false, signIn,
        } as unknown as unknown as Parameters<typeof ShortsStudio>[0]['s']}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Opening your Studio');
    expect(screen.queryByRole('button', { name: /Unlock|Open Studio/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/Confirm ownership/)).not.toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });
  it('keeps one loading state through connection and replaces it when content arrives', () => {
    const base = {
      section: 'content', actor: 'ak_connected', busy: false, authenticated: true,
    };
    const studio = (state: object) => (
      <MemoryRouter initialEntries={['/shorts/studio/content']}>
        <ShortsStudio s={{ ...base, ...state } as unknown as Parameters<typeof ShortsStudio>[0]['s']} />
      </MemoryRouter>
    );
    const { rerender } = render(studio({ restoringCreatorSession: true }));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Refresh Studio' })).toBeDisabled();
    expect(screen.queryByText('Your next idea belongs here')).not.toBeInTheDocument();
    rerender(studio({ restoringCreatorSession: false }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading your Studio');
    rerender(studio({ dashboard: { shorts: [] } }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('Your next idea belongs here')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Refresh Studio' })).toBeEnabled();
  });
  it('replaces analytics loading with the error instead of leaving placeholders running', () => {
    const base = {
      section: 'analytics', authenticated: true, dashboard: { shorts: [] },
    };
    const studio = (state: object) => (
      <MemoryRouter initialEntries={['/shorts/studio/analytics']}>
        <ShortsStudio s={{ ...base, ...state } as unknown as Parameters<typeof ShortsStudio>[0]['s']} />
      </MemoryRouter>
    );
    const { rerender } = render(studio({}));
    expect(screen.getByRole('status')).toHaveTextContent('Loading your analytics');
    rerender(studio({ performanceError: 'Could not load analytics. Please try again.' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load analytics');
  });
});
