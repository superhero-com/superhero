/**
 * Registration lifecycle for the chat offline worker (`public/chat-offline-sw.js`).
 *
 * Registration is deferred until the user is actually on a chat route. The worker
 * installs a `fetch` handler on the wallet's own origin, so a visitor who never
 * opens chat should not be carrying one: it costs them storage, it survives long
 * after the visit, and until this hook existed every visitor got one at app mount.
 *
 * The same hook is the removal path. A deployment that dark-ships chat (no
 * `NOSTR_RELAY_URLS`) must not leave the worker installed on devices that
 * registered it while chat was on — nothing else in the app would ever take it
 * back off, and a worker is not evicted by shipping a build that stops
 * registering it.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trustedScriptUrl } from '@/utils/trustedTypes';

const SW_URL = '/chat-offline-sw.js';
const SW_SCOPE = '/chat';

export function useChatServiceWorker(relayCount: number): void {
  const { pathname } = useLocation();
  const onChatRoute = pathname === SW_SCOPE || pathname.startsWith(`${SW_SCOPE}/`);
  const chatEnabled = relayCount > 0;

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    if (!chatEnabled) {
      navigator.serviceWorker
        .getRegistration(SW_SCOPE)
        .then((reg) => {
          if (!reg) return;
          // Only ours: `getRegistration` resolves the registration CONTROLLING the
          // scope, which off a chat route can be the root notifications worker. All
          // three slots name the same script, and `active` is null mid-install.
          const script = (reg.installing || reg.waiting || reg.active)?.scriptURL;
          if (script?.endsWith(SW_URL)) reg.unregister();
        })
        .catch(() => {});
      return;
    }

    if (!onChatRoute) return;

    navigator.serviceWorker
      // Trusted Types is enforced (`require-trusted-types-for 'script'`), and a
      // raw string here would only survive via the default policy's fallback.
      .register(trustedScriptUrl(SW_URL), { scope: SW_SCOPE })
      .catch(() => {
        // Non-fatal: offline caching won't work, but chat still functions.
      });
  }, [onChatRoute, chatEnabled]);
}
