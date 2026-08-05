import {
  afterEach, describe, expect, it,
} from 'vitest';
import { isIOSWebKit, isMobileDevice, isStandalone } from '@/utils/displayMode';

function stubUserAgent(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true });
}

function stubPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', { value: platform, configurable: true });
}

function stubMaxTouchPoints(points: number) {
  Object.defineProperty(window.navigator, 'maxTouchPoints', { value: points, configurable: true });
}

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

/** matchMedia stub that answers per query, for helpers that probe more than one. */
function stubMatchMediaByQuery(matcher: (query: string) => boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: matcher(query),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

function stubNavigatorStandalone(value: boolean | undefined) {
  Object.defineProperty(window.navigator, 'standalone', { value, configurable: true });
}

const originalUA = window.navigator.userAgent;
const originalPlatform = window.navigator.platform;
const originalMaxTouchPoints = window.navigator.maxTouchPoints;
const originalMatchMedia = window.matchMedia;

afterEach(() => {
  stubUserAgent(originalUA);
  stubPlatform(originalPlatform);
  stubMaxTouchPoints(originalMaxTouchPoints);
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: originalMatchMedia });
  Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
});

describe('isIOSWebKit', () => {
  it('detects iPhone Safari via user agent', () => {
    stubUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    stubPlatform('iPhone');
    stubMaxTouchPoints(5);
    expect(isIOSWebKit()).toBe(true);
  });

  it('detects iPadOS 13+ reporting as desktop Mac with multi-touch', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15');
    stubPlatform('MacIntel');
    stubMaxTouchPoints(5);
    expect(isIOSWebKit()).toBe(true);
  });

  it('is false for a genuine desktop Mac (no multi-touch)', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15');
    stubPlatform('MacIntel');
    stubMaxTouchPoints(0);
    expect(isIOSWebKit()).toBe(false);
  });

  it('is false for desktop Chrome', () => {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
    stubPlatform('Win32');
    stubMaxTouchPoints(0);
    expect(isIOSWebKit()).toBe(false);
  });

  it('is false for Android Chrome', () => {
    stubUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile');
    stubPlatform('Linux armv8l');
    stubMaxTouchPoints(5);
    expect(isIOSWebKit()).toBe(false);
  });
});

describe('isMobileDevice', () => {
  it('is true on an iPhone', () => {
    stubUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15');
    stubPlatform('iPhone');
    stubMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('is true on an iPad reporting as a desktop Mac', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15');
    stubPlatform('MacIntel');
    stubMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('is true on Android Chrome', () => {
    stubUserAgent('Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile');
    stubPlatform('Linux armv8l');
    stubMaxTouchPoints(5);
    expect(isMobileDevice()).toBe(true);
  });

  it('is false on desktop Chrome for Windows', () => {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
    stubPlatform('Win32');
    stubMaxTouchPoints(0);
    stubMatchMediaByQuery(() => false);
    expect(isMobileDevice()).toBe(false);
  });

  it('is false on a desktop Mac', () => {
    stubUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15');
    stubPlatform('MacIntel');
    stubMaxTouchPoints(0);
    stubMatchMediaByQuery(() => false);
    expect(isMobileDevice()).toBe(false);
  });

  it('falls back to a coarse, hover-less pointer when the UA gives nothing away', () => {
    stubUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0');
    stubPlatform('Linux x86_64');
    stubMaxTouchPoints(5);
    stubMatchMediaByQuery((query) => query.includes('pointer: coarse'));
    expect(isMobileDevice()).toBe(true);
  });

  it('is false for a touchscreen laptop, which is coarse but still hovers', () => {
    stubUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0');
    stubPlatform('Win32');
    stubMaxTouchPoints(10);
    // The real query is a single `(pointer: coarse) and (hover: none)` — a
    // device that hovers fails it outright.
    stubMatchMediaByQuery(() => false);
    expect(isMobileDevice()).toBe(false);
  });
});

describe('isStandalone', () => {
  it('is true when the display-mode: standalone media query matches', () => {
    stubMatchMedia(true);
    stubNavigatorStandalone(undefined);
    expect(isStandalone()).toBe(true);
  });

  it('is true when navigator.standalone is set (iOS signal)', () => {
    stubMatchMedia(false);
    stubNavigatorStandalone(true);
    expect(isStandalone()).toBe(true);
  });

  it('is false when neither signal indicates standalone', () => {
    stubMatchMedia(false);
    stubNavigatorStandalone(undefined);
    expect(isStandalone()).toBe(false);
  });
});
