/**
 * Dismissal behaviour for the two install affordances.
 *
 * Neither component had a test file. The regressions pinned here are the ones
 * that make an install prompt read as nagware: a dismissal that does not
 * survive a reload, and an affordance that keeps offering to install an app
 * the user has already installed.
 */
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { act, render, screen } from '@testing-library/react';
import React from 'react';
import en from '@/locales/en.json';

const mocks = vi.hoisted(() => ({
  canPrompt: true,
  isIOS: false,
  isInstalled: false,
  promptInstall: vi.fn(async () => true),
  mobile: true,
  standalone: false,
}));

// Resolves the real en.json strings, so a query for the dismiss control matches its LABEL and not
// an untranslated key that happens to contain the same word.
vi.mock('react-i18next', async () => {
  const ReactMod = await import('react');
  const strings = (await import('@/locales/en.json')).default;
  const translate = (key: string, options?: Record<string, unknown>): string => {
    const value = key.split('.').reduce<unknown>(
      (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
      strings,
    );
    if (typeof value !== 'string') return key;
    return value.replace(/{{(\w+)}}/g, (token, name) => String(options?.[name] ?? token));
  };
  // The iOS hint interpolates the Share glyph into the MIDDLE of a sentence, so
  // the mock has to substitute components the way the real Trans does — without
  // it that string could only be translated as three unorderable fragments.
  const Trans = ({ i18nKey, components }: {
    i18nKey: string;
    components?: Record<string, React.ReactElement>;
  }) => ReactMod.createElement(
    ReactMod.Fragment,
    null,
    ...translate(i18nKey).split(/(<[a-zA-Z]\w*\s*\/>)/g).map((part, index) => {
      const tag = /^<([a-zA-Z]\w*)\s*\/>$/.exec(part);
      const node = tag && components?.[tag[1]];
      return node ? ReactMod.cloneElement(node, { key: `slot-${index}` }) : part;
    }),
  );
  return { useTranslation: () => ({ t: translate }), Trans };
});

vi.mock('@/hooks/usePwaInstall', () => ({
  usePwaInstall: () => ({
    canPrompt: mocks.canPrompt,
    isIOS: mocks.isIOS,
    isInstalled: mocks.isInstalled,
    promptInstall: mocks.promptInstall,
  }),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isMobileDevice: () => mocks.mobile,
  isIOSWebKit: () => mocks.isIOS,
}));

const { PwaInstallFab } = await import('../PwaInstallGuide');
const { PwaInstallPrompt } = await import('../PwaInstallPrompt');

beforeEach(() => {
  window.localStorage.clear();
  mocks.canPrompt = true;
  mocks.isIOS = false;
  mocks.isInstalled = false;
  mocks.mobile = true;
  mocks.standalone = false;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

/** The FAB waits 2.5s before appearing, so every case has to get past that. */
const showFab = async () => {
  await act(async () => { vi.advanceTimersByTime(3000); });
};

describe('PwaInstallFab', () => {
  it('can be dismissed, and stays dismissed across a remount', async () => {
    // The regression: the FAB had no dismiss control at all, on every route, for
    // the life of the session.
    const { unmount } = render(<PwaInstallFab canNativePrompt onOpenGuide={vi.fn()} />);
    await showFab();

    await act(async () => { screen.getByRole('button', { name: 'Dismiss' }).click(); });
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();

    unmount();
    render(<PwaInstallFab canNativePrompt onOpenGuide={vi.fn()} />);
    await showFab();
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('hides once the app reports itself installed', async () => {
    // isStandalone() is false in the tab the install was started from, so without
    // the isInstalled prop the FAB kept offering to install an installed app.
    render(<PwaInstallFab canNativePrompt onOpenGuide={vi.fn()} isInstalled />);
    await showFab();

    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();
  });

  it('stops pulsing instead of re-rendering twice every nine seconds forever', async () => {
    // The pulse interval used to run for the life of the page.
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    render(<PwaInstallFab canNativePrompt onOpenGuide={vi.fn()} />);
    await showFab();
    clearSpy.mockClear();

    // Three pulse cycles at 9s each.
    await act(async () => { vi.advanceTimersByTime(9000 * 3 + 100); });

    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});

describe('the two affordances share one dismissal', () => {
  // On mobile Android both are mounted at once: the card renders null until a
  // `beforeinstallprompt` arrives, so it is sitting there holding whatever the
  // snooze said when IT mounted. Reading that once per instance meant dismissing
  // the FAB and then receiving a late prompt surfaced the card anyway.
  const Both = () => (
    <>
      <PwaInstallFab canNativePrompt={false} onOpenGuide={vi.fn()} />
      <PwaInstallPrompt />
    </>
  );

  it('does not surface the card after the FAB was dismissed', async () => {
    mocks.canPrompt = false;
    const { container, rerender } = render(<Both />);
    await showFab();

    await act(async () => { screen.getByRole('button', { name: 'Dismiss' }).click(); });

    // The late beforeinstallprompt the user never asked for.
    mocks.canPrompt = true;
    await act(async () => { rerender(<Both />); });

    expect(container).toBeEmptyDOMElement();
  });
});

describe('PwaInstallPrompt', () => {
  it('stays dismissed across a remount', async () => {
    // The regression: dismissal lived in component state, so the card returned on
    // every reload with no way to ever say "never".
    const { unmount } = render(<PwaInstallPrompt />);
    // The card ships collapsed; the X lives in the expanded state.
    await act(async () => { screen.getByRole('button', { name: /install app/i }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Dismiss' }).click(); });
    expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull();

    unmount();
    const { container } = render(<PwaInstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when already installed', () => {
    mocks.isInstalled = true;
    const { container } = render(<PwaInstallPrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the iOS instructions from locale strings', async () => {
    // Every string in this dialog used to be hardcoded English, so a translated
    // build showed a localised title above an English body.
    mocks.isIOS = true;
    mocks.canPrompt = false;
    render(<PwaInstallPrompt />);
    await act(async () => { screen.getByRole('button', { name: /install app/i }).click(); });
    await act(async () => { screen.getByRole('button', { name: 'Show Instructions' }).click(); });

    const strings = en.common.views.landing.pwaInstall;
    expect(screen.getByText(strings.iosIntro)).toBeTruthy();
    expect(screen.getByText(strings.iosStep2Hint)).toBeTruthy();
    // The Share glyph sits mid-sentence, so the hint has to render as one
    // translated string wrapped around the icon.
    expect(screen.getByText(/icon in Safari's toolbar/)).toBeTruthy();
    // Radix only sets aria-describedby when a DialogDescription is present, so
    // without one a screen reader announces the title and nothing else.
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby');
  });

  it('survives a localStorage that throws', () => {
    // Safari private mode and blocked site data both throw on access; the card
    // must still render rather than take the app down.
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => render(<PwaInstallPrompt />)).not.toThrow();
    spy.mockRestore();
  });
});
