import { describe, expect, it, vi } from 'vitest';
import {
  getMobileFooterNavigationItems,
  getNavigationItems,
  getAppNavigationItems,
  getMobileMoreNavigationItems,
  getActiveNavigationPath,
} from '../navigationItems';
import { isStandalone } from '@/utils/displayMode';

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('chat navigation on browsers and installed apps', () => {
  it('shows Chat in the desktop sidebar even without an account', () => {
    expect(ids(getNavigationItems())).toContain('chat');
    expect(ids(getAppNavigationItems())).toContain('chat');
    expect(ids(getAppNavigationItems('ak_test'))).toContain('chat');
  });

  it('shows Chat directly in the mobile footer rather than under More', () => {
    expect(ids(getMobileFooterNavigationItems())).toContain('chat');
    expect(ids(getMobileFooterNavigationItems('ak_test'))).toContain('chat');
    expect(ids(getMobileMoreNavigationItems())).not.toContain('chat');
  });

  it('keeps Chat active on inbox and conversation routes', () => {
    expect(getActiveNavigationPath('/chat', getAppNavigationItems())).toBe('/chat');
    expect(getActiveNavigationPath('/chat/dm/peer', getAppNavigationItems())).toBe('/chat');
    expect(getActiveNavigationPath('/chat/room', getMobileFooterNavigationItems())).toBe('/chat');
  });
});

describe('display mode detection remains available for other PWA features', () => {
  it('detects the standalone display-mode media query', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q === '(display-mode: standalone)' }),
    });
    vi.stubGlobal('navigator', {});
    expect(isStandalone()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('detects iOS standalone', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { standalone: true });
    expect(isStandalone()).toBe(true);
    vi.unstubAllGlobals();
  });

  it('is false in a plain browser tab', () => {
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { standalone: false });
    expect(isStandalone()).toBe(false);
    vi.unstubAllGlobals();
  });
});
