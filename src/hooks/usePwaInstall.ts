import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { isIOSWebKit, isStandalone } from '@/utils/displayMode';

/**
 * The Chromium-only install prompt event. Not yet part of TS's DOM lib, and
 * not available at all on iOS/Safari or Firefox — see `src/utils/displayMode.ts`
 * and the hook below for how each platform is handled.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface UsePwaInstallResult {
  /** True once a Chromium `beforeinstallprompt` has been captured and can be replayed. */
  canPrompt: boolean;
  /** Replays the stashed install prompt. Resolves `false` if none is available. */
  promptInstall: () => Promise<boolean>;
  /** True on iOS/iPadOS Safari (and iOS WebKit-backed browsers), which has no install API. */
  isIOS: boolean;
  /** True once the app is already running standalone (installed). */
  isInstalled: boolean;
}

/**
 * Encapsulates the platform reality around PWA installability:
 * - Chromium (desktop/Android): stash the one-shot `beforeinstallprompt`
 *   event so a real "Install" button can replay it later via `promptInstall`.
 * - iOS/iPadOS Safari: no API exists — callers should show hand-authored
 *   "Share -> Add to Home Screen" instructions when `isIOS` is true.
 * - Everything else (e.g. Firefox): neither `canPrompt` nor `isIOS` will be
 *   true, so callers should render nothing.
 */
export function usePwaInstall(): UsePwaInstallResult {
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone());
  const [isIOS] = useState<boolean>(() => isIOSWebKit());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the browser's default mini-infobar; we show our own affordance instead.
      event.preventDefault();
      deferredPromptRef.current = event as BeforeInstallPromptEvent;
      setCanPrompt(true);
    };

    const handleAppInstalled = () => {
      // The event is single-use regardless of outcome; drop it and flip to installed
      // immediately so the UI disappears without requiring a reload.
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<boolean> => {
    const evt = deferredPromptRef.current;
    if (!evt) return false;

    // Single-use: clear it now so we never attempt to replay a spent prompt.
    deferredPromptRef.current = null;
    setCanPrompt(false);

    await evt.prompt();
    const { outcome } = await evt.userChoice;
    return outcome === 'accepted';
  }, []);

  return {
    canPrompt, promptInstall, isIOS, isInstalled,
  };
}
