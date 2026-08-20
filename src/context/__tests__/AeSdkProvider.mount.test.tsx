import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';

/**
 * The provider mounts the WYSIWYS sign prompt app-wide (build-plan §3.4 P4) so a
 * signature can be requested from any screen and the inline signer fails closed
 * if the prompt is absent. This guards THAT binding at `AeSdkProvider`'s render —
 * it fails if the `<WalletSignPrompt/>` mount is removed. The direct
 * `WalletSignPrompt` unit tests render the component themselves and so cannot
 * catch a provider that stops mounting it (a folded acceptance criterion).
 */
vi.mock('@/libs/WebSocketClient', () => ({
  default: { connect: vi.fn(), disconnect: vi.fn() },
}));

// Stand in for the lazily-imported prompt with a cheap sentinel: the assertion is
// that the provider MOUNTS it, not a re-test of the prompt's own crypto stack.
vi.mock('@/features/wallet/components/WalletSignPrompt', () => ({
  default: () => <div data-testid="wallet-sign-prompt-mounted" />,
}));

describe('AeSdkProvider — mounts the WYSIWYS sign prompt', () => {
  it('renders the lazy WalletSignPrompt so a signature can be requested app-wide', async () => {
    const { AeSdkProvider } = await import('@/context/AeSdkProvider');
    render(<AeSdkProvider><div>app</div></AeSdkProvider>);
    expect(await screen.findByTestId('wallet-sign-prompt-mounted')).toBeInTheDocument();
  });
});
