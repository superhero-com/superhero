/* eslint-disable no-restricted-globals */
/*
 * Superhero notifications service worker.
 *
 * Minimal, dedicated worker for BROWSER WEB PUSH (VAPID). It is intentionally
 * NOT a full PWA/offline worker — it only handles `push` (show the OS
 * notification), `notificationclick` (focus/open the app) and
 * `pushsubscriptionchange` (keep the subscription alive). The backend sends a
 * JSON payload of the shape { title, body, data } (see the web-push channel).
 *
 * Registered on demand from the app when the user enables browser push, with an
 * explicit scope of '/' so it can receive pushes for the whole origin.
 *
 * SCOPE SAFETY — this worker shares an origin with the inline wallet, so an
 * origin-wide scope is only acceptable because the worker CANNOT intercept
 * requests: it registers NO `fetch` handler (and no `onfetch`), so navigation
 * and asset requests — wallet routes included — never pass through it. That is
 * not a comment to trust; __tests__/notifications-sw.test.ts fails if a `fetch`
 * listener is ever added here. Do not add one: it would put a script with
 * control over every request on the same origin as the seed vault.
 *
 * UPDATE PATH — this file is served unhashed from public/ (netlify passthrough,
 * moderate TTL). Browsers re-fetch and byte-compare it on every service-worker
 * update check and replace already-registered copies when it changes, so a
 * change here supersedes existing registrations without any re-registration
 * step. What it serves is therefore controlled by whoever can deploy the
 * superhero repo (a merge to the deployed branch) — the same trust boundary as
 * the rest of the client bundle, no wider.
 */

self.addEventListener('install', () => {
  // Activate immediately so the first subscribe works without a reload.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Non-JSON payload — fall back to raw text as the body.
    payload = { title: 'Superhero', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Superhero';
  // The feed model carries the notification type ALONGSIDE its data bag
  // (FeedItem.type + FeedItem.data), while every routing decision below keys off
  // `data.type`. Accept it from either position rather than silently routing every
  // click to '/' if the backend only sets the top-level field.
  const data = { ...(payload.data || {}) };
  if (!data.type && payload.type) data.type = payload.type;
  const options = {
    body: payload.body || '',
    // PNG, not the SVG favicon: several platforms — Android Chrome most notably —
    // do not reliably rasterise SVG notification icons, and silently drop them, so
    // the OS notification arrives unbranded. This is the same 192px asset the
    // manifest ships and scripts/verify-pwa-assets.cjs gates in CI, so it cannot
    // go missing without the deploy check failing.
    icon: '/icons/icon-192.png',
    // Chrome masks the badge down to a small monochrome glyph, so the full-colour
    // icon renders as a silhouette here. That beats the SVG (dropped entirely) and
    // beats omitting it (the browser substitutes its own logo); a purpose-built
    // monochrome badge asset would render better still.
    badge: '/icons/icon-192.png',
    // Carry the backend `data` (type, txHash, deep-link hints…) to the click handler.
    data,
    // Coalesce repeats of the same logical notification if the backend sets a tag.
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * In-app path a notification should open.
 *
 * The backend deliberately ships routing HINTS (type + ids) rather than a url,
 * because the same payload also feeds the mobile app, which has its own routes
 * (see post-comment.notification.ts) — so the mapping belongs on each client.
 * This MUST therefore stay in step with getNotificationLink() in
 * src/features/notifications/notificationNavigation.ts;
 * __tests__/notifications-sw.test.ts cross-checks the two so they cannot drift.
 *
 * A `data.url`, if a payload ever carries one, still wins over this.
 */
function resolveNotificationPath(data) {
  const str = (value) => (typeof value === 'string' && value ? value : undefined);
  // Post ids are stored as `<id>_v3`; every in-app post link drops that suffix.
  const postPath = (id) => `/post/${encodeURIComponent(id.replace(/_v3$/, ''))}`;

  switch (data.type) {
    // A comment is itself a post, so this opens the COMMENT (rendered under its
    // ancestor chain), not the parent post the recipient already knows about.
    case 'post-comment': {
      const comment = str(data.commentId) || str(data.parentPostId);
      return comment ? postPath(comment) : '/';
    }
    // Both settle on-chain into the wallet; the wallet view lists the transfer.
    case 'incoming-transfer':
    case 'invitation-claimed':
      return '/wallet';
    // The token-detail route resolves a sale address to its room.
    case 'room-membership':
    case 'room-messages': {
      const sale = str(data.saleAddress);
      return sale ? `/trends/tokens/${encodeURIComponent(sale)}` : '/';
    }
    default:
      return '/';
  }
}

/**
 * Same-origin path to open for a notification's payload. Without the origin
 * check a malicious/misconfigured `data.url` could turn a notification click
 * into an open-redirect (openWindow is not origin-scoped) or a dangerous scheme
 * (javascript:/data:).
 */
function resolveTargetPath(data) {
  try {
    const parsed = new URL(data.url || resolveNotificationPath(data), self.location.origin);
    if (parsed.origin !== self.location.origin) return '/';
    // The origin check alone is not enough, because only the PATH survives it.
    // `https://<us>//evil.example/x` is same-origin, but its pathname is
    // `//evil.example/x` — a scheme-relative reference that re-resolves to
    // https://evil.example/x when openTarget rebuilds it, and openWindow (unlike
    // client.navigate) will follow it off-origin. The URL parser has already
    // folded any backslashes to `/`, so this covers `/\evil.example` too.
    if (parsed.pathname.startsWith('//')) return '/';
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return '/';
  }
}

/**
 * Focus an open tab and take it to `path`, opening a new window if that cannot
 * be done. Every step is fallible, and a step that fails must not silently drop
 * the deep-link — landing on the right page is the whole point of the click.
 */
async function openTarget(path) {
  const { href } = new URL(path, self.location.origin);
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  // A tab already showing the target only needs focus — navigating it again
  // would remount the app for nothing.
  const onTarget = windows.find((c) => c.url === href);
  const client = onTarget || windows.find((c) => typeof c.focus === 'function');

  if (client) {
    try {
      // Can reject when the window is not allowed to take focus; the navigation
      // below matters more, so keep going either way.
      await client.focus();
    } catch { /* not focusable — still try to land on the right page */ }
    if (onTarget || path === '/') return;
    // navigate() is missing in some browsers and REJECTS for any client this
    // worker does not control — i.e. every tab that was already open before the
    // worker activated. Falling through to openWindow is what makes the
    // deep-link land instead of leaving the user on whatever page was open.
    if (typeof client.navigate === 'function') {
      try {
        await client.navigate(path);
        return;
      } catch { /* fall through to openWindow */ }
    }
  }

  if (self.clients.openWindow) {
    try {
      await self.clients.openWindow(path);
    } catch { /* nothing left to try */ }
  }
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // Chained through waitUntil so the browser keeps the worker alive until the
  // focus/navigate/open settles — otherwise it can be recycled mid-navigation
  // and the deep-link never lands.
  event.waitUntil(openTarget(resolveTargetPath(event.notification.data || {})));
});

/*
 * The browser can drop and re-issue a push subscription on its own (expiry, a
 * browser-data reset, a rotated VAPID key). The old endpoint then answers
 * 404/410 and the backend prunes it (send-web-push.queue), so without this
 * handler push dies permanently AND silently — the UI keeps reporting
 * "subscribed" because a subscription does still exist in the browser.
 *
 * A worker cannot register the replacement itself: the bearer session lives in
 * localStorage, which is unavailable here. So it re-creates the subscription and
 * hands it to any open tab, which POSTs it under the session. With no tab open,
 * the app re-asserts on its next start (NotificationFeedClient.doStart) — and if
 * even re-subscribing fails, the app falls back to reporting "not subscribed",
 * which surfaces the enable-push hint again rather than pretending push works.
 */
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      const oldSub = event.oldSubscription;
      let sub = event.newSubscription
        || (await self.registration.pushManager.getSubscription());
      if (!sub) {
        // Chrome historically fires this event with neither subscription set, so
        // re-subscribe with the key the old one was created from.
        const key = oldSub && oldSub.options && oldSub.options.applicationServerKey;
        if (!key) return;
        try {
          sub = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key,
          });
        } catch {
          return; // nothing more this worker can do
        }
      }

      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((client) => client.postMessage({
        type: 'superhero:push-subscription-changed',
        // Carried so the app only re-registers if it OWNED the endpoint that just
        // went away — a subscription is per browser, so another account's tab
        // must not silently inherit this browser's OS-level push.
        oldEndpoint: oldSub && oldSub.endpoint,
        subscription: sub.toJSON(),
      }));
    })(),
  );
});
