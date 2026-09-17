import { render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import ProfileIdentity from '../ProfileIdentity';

vi.mock('@/utils/address', () => ({ copyToClipboard: vi.fn(async () => true) }));

const ADDR = 'ak_2XfPqR7nL9vK4mB1sT6wY8dH3jN5cZ0gQxEeUuIiOoPp8K7Qr';

function renderIdentity(overrides: Partial<Parameters<typeof ProfileIdentity>[0]> = {}) {
  return render(
    <ProfileIdentity
      address={ADDR}
      displayName="Ariadne"
      handle="ariadne.chain"
      isVerified={false}
      bio="Building bonding-curve tooling on aeternity."
      site={null}
      ownProfile={false}
      {...overrides}
    />,
  );
}

describe('ProfileIdentity', () => {
  it('paints the display name in the standard text colour, not neon teal (D1)', () => {
    renderIdentity();
    const name = screen.getByTestId('profile-display-name');
    expect(name.className).toContain('text-[var(--standard-font-color)]');
    expect(name.className).not.toContain('text-[var(--neon-teal)]');
    expect(name).toHaveTextContent('Ariadne');
  });

  it('renders the address as a copy chip, not body text (D2)', () => {
    renderIdentity();
    expect(screen.getByTestId('profile-address-chip')).toBeInTheDocument();
  });

  it('shows the teal handle only when it differs from the display name', () => {
    renderIdentity();
    const handle = screen.getByTestId('profile-handle');
    expect(handle).toHaveTextContent('ariadne.chain');
    expect(handle.className).toContain('text-[var(--neon-teal)]');
  });

  it('suppresses the handle when it is already the display name', () => {
    renderIdentity({ displayName: 'ariadne.chain', handle: 'ariadne.chain' });
    expect(screen.queryByTestId('profile-handle')).toBeNull();
  });

  it('renders the website chip with a safe rel and the scheme stripped', () => {
    renderIdentity({ site: 'https://ariadne.dev/' });
    const chip = screen.getByTestId('profile-website-chip');
    expect(chip).toHaveTextContent('ariadne.dev');
    expect(chip).toHaveAttribute('rel', 'nofollow noopener noreferrer');
    expect(chip).toHaveAttribute('href', 'https://ariadne.dev/');
  });

  it('prompts to add a bio on your own empty profile, and renders nothing on someone else’s', () => {
    const own = renderIdentity({ bio: '', ownProfile: true });
    expect(own.getByTestId('profile-bio-empty')).toBeInTheDocument();
    own.unmount();

    renderIdentity({ bio: '', ownProfile: false });
    expect(screen.queryByTestId('profile-bio-empty')).toBeNull();
    expect(screen.queryByTestId('profile-bio')).toBeNull();
  });
});
