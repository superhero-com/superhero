/* eslint-disable no-restricted-globals */
/*
 * Superhero Chat — offline cache service worker.
 *
 * This is a SEPARATE worker from notifications-sw.js, registered with a
 * restricted scope of '/chat' so it ONLY intercepts requests under the
 * /chat route tree. It deliberately does NOT touch the root '/' scope,
 * which is reserved for the notifications push worker that handles VAPID
 * and must never intercept fetch (security constraint — see notifications-sw.js).
 *
 * What this worker does:
 * 1. Same-origin static assets under /chat — cache-first for content-hashed
 *    /assets/* (the URL changes when the bytes do), stale-while-revalidate with
 *    a 1-day ceiling for everything else (logos, icons: stable URLs, mutable
 *    bytes — an unbounded entry would strand a bad asset with no way to refresh).
 * 2. Network-first with a cached /chat shell fallback for chat navigations, so
 *    an offline deep link still lands in the app rather than on a dead page.
 *
 * What it deliberately does NOT do:
 * - Touch cross-origin requests. The worker inherits the page's enforcing CSP,
 *   where a worker `fetch()` is a `connect-src` sink rather than `img-src`, so
 *   re-fetching a third-party asset here would fail under a policy the page
 *   itself satisfies. Cross-origin requests are left entirely alone.
 * - Cache anything that is not a 200 with a non-HTML content-type. The SPA
 *   answers unknown paths with `text/html`, so an unguarded `response.ok` will
 *   happily store the app shell under a `.js` URL; `nosniff` then refuses to
 *   execute it and the cache never re-checks. The server 404s subresources for
 *   the same reason (server/index.cjs) — this is the second half of that fix.
 * - Queue outgoing messages. A previous revision documented a BroadcastChannel
 *   replay protocol that no client ever implemented, so an offline send was
 *   silently dropped while the app looked like it supported one. Removed rather
 *   than left as a promise the code does not keep.
 *
 * SECURITY — this worker only caches chat UI assets. It never sees wallet
 * routes, seed data, or signing requests. The scope restriction enforces this.
 *
 * REGISTRATION — registered from src/features/chat/hooks/useChatServiceWorker.ts
 * with { scope: '/chat' }, from the chat route tree only.
 */

// Bumped whenever the caching RULES change: `activate` deletes every other
// `sh-chat-*` cache, which is what evicts entries an older revision stored under
// rules we no longer trust.
const CACHE_NAME = 'sh-chat-v2';

// The navigation fallback. Precached on install so an offline deep link to
// /chat/dm/<pubkey> has a shell to land on — client-side routing never issues a
// document request for those URLs, so they are never cached by visiting them.
const SHELL_URL = '/chat';

// Unhashed assets change bytes without changing URL, so they get a ceiling.
const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60;

// ── Cache policy ─────────────────────────────────────────────────────────────

/**
 * Whether a response may be stored. The content-type test is the load-bearing
 * one: `response.ok` alone accepts the SPA's HTML fallback for a missing asset.
 */
function isCacheable(response, request) {
  if (!response || response.status !== 200 || response.type === 'opaque') return false;
  const contentType = response.headers.get('content-type') || '';
  // A navigation is the one request that SHOULD store HTML.
  if (request.mode === 'navigate') return true;
  return !/^text\/html\b/i.test(contentType);
}

async function fetchAndCache(request, cache, maxAgeSeconds) {
  const response = await fetch(request);
  if (!isCacheable(response, request)) return response;

  // No age check will ever read a timestamp on an `Infinity` entry, so store the
  // response as it streams. Stamping one costs a full buffer of every chunk in
  // the bundle before the page is handed a single byte.
  if (maxAgeSeconds === Infinity) {
    cache.put(request, response.clone()).catch(() => {});
    return response;
  }

  const headers = new Headers(response.headers);
  headers.set('sw-cached-at', String(Date.now()));
  const cloned = new Response(await response.clone().arrayBuffer(), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
  // Not awaited past a failure: a quota error here must not turn an already-
  // fetched response into a network error for the page. The write is still
  // ordered before `return` so a caller relying on cache-then-serve (none do
  // today) would see it land, but a rejection can no longer propagate out.
  await cache.put(request, cloned).catch(() => {});
  return response;
}

/**
 * Serve from cache, revalidating in the background once the entry passes
 * `maxAgeSeconds`. `Infinity` is reserved for content-hashed URLs, where a
 * changed byte means a changed URL and a stale entry is impossible.
 */
async function cacheFirst(request, maxAgeSeconds) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    const cachedAt = cached.headers.get('sw-cached-at');
    if (cachedAt && maxAgeSeconds !== Infinity) {
      const age = (Date.now() - parseInt(cachedAt, 10)) / 1000;
      if (age > maxAgeSeconds) fetchAndCache(request, cache, maxAgeSeconds).catch(() => {});
    }
    return cached;
  }

  return fetchAndCache(request, cache, maxAgeSeconds);
}

/**
 * Only the shell is stored. A per-URL copy of /chat/dm/<address> serves nothing the
 * fallback below does not, and keys an entry by the conversation partner — cleartext,
 * and outliving a logout, beside a message history kept encrypted at rest.
 */
async function networkFirstWithShellFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  // Keyed by SHELL_URL, not the request, so `/chat?ref=x` refreshes the one entry.
  const isShell = new URL(request.url).pathname === SHELL_URL;
  try {
    const response = await fetch(request);
    if (isShell && isCacheable(response, request)) {
      cache.put(SHELL_URL, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Client-side routing means /chat/dm/<id> was probably never fetched as a
    // document; the precached shell boots the app, which then renders the route.
    const shell = await cache.match(SHELL_URL);
    if (shell) return shell;

    return new Response(
      '<h1>Offline</h1><p>Chat is unavailable offline. Open the app when connected.</p>',
      { status: 503, headers: { 'Content-Type': 'text/html' } },
    );
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // Best-effort: a failed precache must not fail the install and leave the
      // previous worker in control.
      .then((cache) => cache.add(SHELL_URL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('sh-chat-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Cross-origin is left to the page, which reaches it under a CSP directive
  // this worker's `fetch()` would not satisfy.
  if (url.origin !== self.location.origin) return;

  // Content-hashed build output: the URL is the version, so it never goes stale.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, Infinity));
    return;
  }

  if (/\.(?:js|css|woff2?|png|svg|ico|webp|jpg)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, DEFAULT_MAX_AGE_SECONDS));
    return;
  }

  if (url.pathname.startsWith('/chat')) {
    event.respondWith(networkFirstWithShellFallback(request));
  }
});
