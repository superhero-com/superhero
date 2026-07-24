import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { usePwaInstall } from '@/hooks/usePwaInstall';

function makeBeforeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as any;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome, platform: 'web' });
  return event as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
}

describe('usePwaInstall', () => {
  beforeEach(() => {
    Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false, addEventListener: () => {}, removeEventListener: () => {},
      }),
    });
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', { value: 'Win32', configurable: true });
    Object.defineProperty(window.navigator, 'maxTouchPoints', { value: 0, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts with no prompt captured and not installed', () => {
    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.canPrompt).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isIOS).toBe(false);
  });

  it('captures beforeinstallprompt, prevents the default mini-infobar, and exposes canPrompt', () => {
    const { result } = renderHook(() => usePwaInstall());
    const evt = makeBeforeInstallPromptEvent();
    const preventDefaultSpy = vi.spyOn(evt, 'preventDefault');

    act(() => {
      window.dispatchEvent(evt);
    });

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(result.current.canPrompt).toBe(true);
  });

  it('promptInstall replays the stashed event, resolves accepted, and clears canPrompt', async () => {
    const { result } = renderHook(() => usePwaInstall());
    const evt = makeBeforeInstallPromptEvent('accepted');

    act(() => {
      window.dispatchEvent(evt);
    });
    expect(result.current.canPrompt).toBe(true);

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(accepted).toBe(true);
    expect(result.current.canPrompt).toBe(false);
  });

  it('promptInstall resolves false and is a no-op when no prompt was captured', async () => {
    const { result } = renderHook(() => usePwaInstall());

    let accepted: boolean | undefined;
    await act(async () => {
      accepted = await result.current.promptInstall();
    });

    expect(accepted).toBe(false);
  });

  it('promptInstall does not replay a spent (single-use) event on a second call', async () => {
    const { result } = renderHook(() => usePwaInstall());
    const evt = makeBeforeInstallPromptEvent('accepted');

    act(() => {
      window.dispatchEvent(evt);
    });

    await act(async () => {
      await result.current.promptInstall();
    });
    expect(evt.prompt).toHaveBeenCalledTimes(1);

    let secondCallResult: boolean | undefined;
    await act(async () => {
      secondCallResult = await result.current.promptInstall();
    });

    expect(evt.prompt).toHaveBeenCalledTimes(1);
    expect(secondCallResult).toBe(false);
  });

  it('appinstalled clears the stashed prompt and flips isInstalled without a reload', () => {
    const { result } = renderHook(() => usePwaInstall());
    const evt = makeBeforeInstallPromptEvent();

    act(() => {
      window.dispatchEvent(evt);
    });
    expect(result.current.canPrompt).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('appinstalled'));
    });

    expect(result.current.canPrompt).toBe(false);
    expect(result.current.isInstalled).toBe(true);
  });

  it('removes its event listeners on unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => usePwaInstall());
    const addedEvents = addSpy.mock.calls.map(([type]) => type);
    expect(addedEvents).toContain('beforeinstallprompt');
    expect(addedEvents).toContain('appinstalled');

    unmount();

    const removedEvents = removeSpy.mock.calls.map(([type]) => type);
    expect(removedEvents).toContain('beforeinstallprompt');
    expect(removedEvents).toContain('appinstalled');
  });

  it('reports isIOS for an iPhone Safari user agent and never exposes canPrompt', () => {
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true,
    });
    Object.defineProperty(window.navigator, 'platform', { value: 'iPhone', configurable: true });

    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isIOS).toBe(true);
    expect(result.current.canPrompt).toBe(false);
  });

  it('reports isInstalled true up front when already running standalone', () => {
    Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true });

    const { result } = renderHook(() => usePwaInstall());
    expect(result.current.isInstalled).toBe(true);
  });
});
