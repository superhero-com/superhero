/**
 * Web-only recommendation to prefer the mobile app for chat.
 *
 * The claims here are deliberately narrow and match what the code actually
 * does, because overstating them is worse than saying nothing:
 *   - DMs are end-to-end encrypted (NIP-04, `../nostr/crypto`).
 *   - The chat key is derived from the wallet seed and cached in memory ONLY.
 *     It is never written to localStorage, sessionStorage or IndexedDB, and is
 *     dropped on lock, on tab teardown, and after 30 minutes idle
 *     (`../identity/nostr-session`, `../identity/nostr.state`).
 *   - Local history lives in IndexedDB as ciphertext (`../storage/chat-store`).
 *
 * What the browser cannot protect against is the browser itself: an extension
 * with access to the page can read what is on screen while chat is unlocked.
 * A sandboxed app has no equivalent exposure, which is the whole point of the
 * recommendation. We do not claim the web chat is insecure, and we do not rank
 * the cipher suite.
 */
import { useCallback, useState } from 'react';
import { ShieldCheck, Smartphone, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'superhero:chat:web-safety-notice-dismissed';

const APP_STORE_URL = 'https://apps.apple.com/us/app/superhero-web3-communities/id6758045846';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.superhero.apps';

/** Storage can throw (private window, blocked site data); never break chat for it. */
function readDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function persistDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    // A viewer who cannot persist the dismissal simply sees it again later.
  }
}

export const WebChatSafetyNotice = () => {
  const [dismissed, setDismissed] = useState(readDismissed);

  const dismiss = useCallback(() => {
    setDismissed(true);
    persistDismissed();
  }, []);

  if (dismissed) return null;

  return (
    <aside
      className="mb-4 rounded-xl border border-cyan-300/25 bg-cyan-300/[0.07] p-3"
      aria-label="Chat security recommendation"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-300/25 bg-cyan-300/10">
          <ShieldCheck className="h-4 w-4 text-cyan-300" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="m-0 text-sm font-semibold text-foreground">
            Chat works here, but the mobile app is the safer place for it
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground">
            Your messages are end-to-end encrypted either way. Your chat key stays in this
            tab&apos;s memory, is never written to browser storage, and is dropped after 30 minutes
            idle. Stored history is encrypted.
          </p>
          <p className="m-0 mt-1 text-sm leading-relaxed text-muted-foreground">
            What a browser cannot rule out is its own extensions: anything you install with
            permission to read pages can read a conversation while it is open. The mobile app is
            sandboxed, so it has no equivalent exposure.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" asChild>
              <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
                Get it on iOS
              </a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer">
                <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
                Get it on Android
              </a>
            </Button>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={dismiss}
          aria-label="Dismiss chat security recommendation"
          className="shrink-0"
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </aside>
  );
};

export default WebChatSafetyNotice;
