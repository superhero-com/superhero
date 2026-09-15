/**
 * The mobile-app card in the connect modal.
 *
 * Pins the two things that were wrong before: it was a flat block pinned to the
 * bottom of the list rather than an expandable card in second place, and it
 * branched on the user agent so a phone only ever saw one of the two stores.
 */
import React from 'react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { act, render, screen } from '@testing-library/react';

import en from '@/locales/en.json';

vi.mock('react-i18next', async () => {
  const strings = (await import('@/locales/en.json')).default;
  const translate = (key: string, options?: Record<string, unknown>): string => {
    const value = key.split('.').reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      strings,
    );
    if (typeof value !== 'string') return (options?.defaultValue as string) ?? key;
    return value;
  };
  return { useTranslation: () => ({ t: translate }) };
});

const { MobileAppCard, MobileAppInstallDialog } = await import('../MobileAppInstall');

const APP_STORE = en.common.modals.connectWallet.downloadAppStore;
const PLAY_STORE = en.common.modals.connectWallet.downloadGooglePlay;

describe('MobileAppCard', () => {
  it('ships collapsed and expands on click, like the cards beside it', async () => {
    render(<MobileAppCard />);

    const header = screen.getByTestId('mobile-app-option');
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: APP_STORE })).toBeNull();

    await act(async () => { header.click(); });

    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('link', { name: APP_STORE })).toBeTruthy();
  });

  it('offers both stores, never one', async () => {
    render(<MobileAppCard />);
    await act(async () => { screen.getByTestId('mobile-app-option').click(); });

    expect(
      screen.getByRole('link', { name: APP_STORE }).getAttribute('href'),
    ).toContain('apps.apple.com');
    expect(
      screen.getByRole('link', { name: PLAY_STORE }).getAttribute('href'),
    ).toContain('play.google.com');
  });

  it('opens both store links in a new tab without leaking the opener', async () => {
    render(<MobileAppCard />);
    await act(async () => { screen.getByTestId('mobile-app-option').click(); });

    [APP_STORE, PLAY_STORE].forEach((name) => {
      const link = screen.getByRole('link', { name });
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    });
  });
});

describe('MobileAppInstallDialog', () => {
  it('shows the same store links as the card', () => {
    render(<MobileAppInstallDialog open onOpenChange={vi.fn()} />);

    expect(screen.getByRole('link', { name: APP_STORE })).toBeTruthy();
    expect(screen.getByRole('link', { name: PLAY_STORE })).toBeTruthy();
  });

  it('omits the web-app line when there is no web-app path to offer', () => {
    // A button that does nothing is worse than no button.
    render(<MobileAppInstallDialog open onOpenChange={vi.fn()} />);

    expect(
      screen.queryByRole('button', { name: 'Install the web app instead' }),
    ).toBeNull();
  });

  it('offers the web-app line when a path exists, and calls it', async () => {
    const onInstallWebApp = vi.fn();
    render(
      <MobileAppInstallDialog open onOpenChange={vi.fn()} onInstallWebApp={onInstallWebApp} />,
    );

    await act(async () => {
      screen.getByRole('button', { name: 'Install the web app instead' }).click();
    });
    expect(onInstallWebApp).toHaveBeenCalled();
  });

  it('describes itself for screen readers', () => {
    // Radix only wires aria-describedby when a DialogDescription is present.
    render(<MobileAppInstallDialog open onOpenChange={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
  });
});
