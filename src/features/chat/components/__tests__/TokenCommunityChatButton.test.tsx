import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Chat is PWA-only, and this button is the entry point that keeps escaping it.
 *
 * The navigation gate (`navigationItems.pwa.test.ts`) covers the footer item.
 * This one lives on the token page instead, so it was left advertising chat on
 * the website after that gate went in — a browser tab has no durable store for
 * the Nostr key it derives from the wallet seed (Safari's 7-day ITP eviction,
 * "clear browsing data"), and losing that key silently loses the ability to
 * decrypt your own history.
 *
 * Covered here rather than in `e2e/wallet-surfaces.spec.ts` because reaching a
 * token page needs live token data; the surface rule does not.
 */
const mocks = vi.hoisted(() => ({ standalone: false }));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
  isMobileDevice: () => false,
}));

// eslint-disable-next-line import/first
import TokenCommunityChatButton from '../TokenCommunityChatButton';

const mount = (saleAddress = 'ct_sale123') => render(
  <MemoryRouter>
    <TokenCommunityChatButton saleAddress={saleAddress} symbol="SOLAR" />
  </MemoryRouter>,
);

describe('TokenCommunityChatButton is PWA-only', () => {
  beforeEach(() => {
    mocks.standalone = false;
  });

  it('links into the token room in an installed PWA', () => {
    mocks.standalone = true;
    mount();

    expect(screen.getByRole('link', { name: /community chat/i }))
      .toHaveAttribute('href', '/chat/ct_sale123');
  });

  it('renders nothing in a browser tab', () => {
    const { container } = mount();
    expect(container).toBeEmptyDOMElement();
  });

  it('still renders nothing without a sale address, PWA or not', () => {
    // The pre-existing guard must survive the display-mode one: a room keyed by
    // an empty address would link at `/chat/`, i.e. the inbox, pretending to be
    // this token's room.
    mocks.standalone = true;
    const { container } = mount('');
    expect(container).toBeEmptyDOMElement();
  });
});
