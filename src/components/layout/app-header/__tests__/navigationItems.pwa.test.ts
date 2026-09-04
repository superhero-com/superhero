import {
  describe, expect, it, vi,
} from 'vitest';
import {
  getMobileFooterNavigationItems,
  getNavigationItems,
  getAppNavigationItems,
  getMobileMoreNavigationItems,
} from '../navigationItems';

/**
 * Chat is PWA-only, on purpose.
 *
 * Chat derives a Nostr identity from the wallet seed and persists key material
 * in client storage. An installed PWA has a durable, origin-scoped store; a
 * mobile browser tab does not — Safari's 7-day ITP eviction and ordinary
 * "clear browsing data" both destroy it, which for a chat identity means
 * silently losing the ability to decrypt your own history.
 *
 * So the entry point is gated on standalone display mode. These tests pin that
 * gate, both directions, because the failure is invisible: nothing errors when
 * chat is offered in a browser tab — the key just evaporates later.
 *
 * NOTE this is about the *entry point*. `/chat` remains routable, so an existing
 * deep link still works; we are not blocking the route, only declining to
 * advertise it where key custody is unsafe.
 */

describe('chat navigation is PWA-gated', () => {
  const ids = (items: { id: string }[]) => items.map((i) => i.id);

  it('shows Chat in the mobile footer when running as an installed PWA', () => {
    const items = getMobileFooterNavigationItems('ak_test', true);
    expect(ids(items)).toContain('chat');
  });

  it('hides Chat in a mobile browser tab', () => {
    // The case that matters: a browser tab has no durable key storage.
    const items = getMobileFooterNavigationItems('ak_test', false);
    expect(ids(items)).not.toContain('chat');
  });

  it('hides Chat when the display mode is unknown', () => {
    // `pwaMode` is optional. An undefined value must fail CLOSED — offering chat
    // by default in an unknown surface is exactly the unsafe direction.
    const items = getMobileFooterNavigationItems('ak_test');
    expect(ids(items)).not.toContain('chat');
  });

  it('keeps the rest of the footer intact in both modes', () => {
    // The gate must remove only Chat, not reshuffle navigation.
    const browser = ids(getMobileFooterNavigationItems('ak_test', false));
    const pwa = ids(getMobileFooterNavigationItems('ak_test', true));

    expect(pwa.filter((id) => id !== 'chat')).toEqual(browser);
    expect(browser).toContain('home');
    expect(browser).toContain('account');
  });

  it('does not expose Chat through the desktop or "More" menus', () => {
    // Other menus have no pwaMode parameter, so a Chat item added to any of them
    // would bypass the gate entirely. This is the regression guard for that.
    expect(ids(getNavigationItems())).not.toContain('chat');
    expect(ids(getAppNavigationItems('ak_test'))).not.toContain('chat');
    expect(ids(getMobileMoreNavigationItems())).not.toContain('chat');
  });
});

describe('isStandalone drives the gate', () => {
  it('detects the standalone display-mode media query', async () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' }),
    });
    vi.stubGlobal('navigator', {});
    const { isStandalone } = await import('@/utils/displayMode');
    expect(isStandalone()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('detects iOS standalone, which does not honour the media query', async () => {
    // iOS historically does not reflect `display-mode: standalone`; without the
    // navigator.standalone fallback, installed iOS users would lose the Chat tab.
    vi.resetModules();
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { standalone: true });
    const { isStandalone } = await import('@/utils/displayMode');
    expect(isStandalone()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false in a plain browser tab', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { standalone: false });
    const { isStandalone } = await import('@/utils/displayMode');
    expect(isStandalone()).toBe(false);
    vi.unstubAllGlobals();
  });
});
