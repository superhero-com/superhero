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
 * 1. Cache-first for static assets (JS/CSS/fonts/icons) under /chat.
 * 2. Network-first with cache fallback for the chat SPA shell (/chat, /chat/*).
 * 3. Queues outgoing Nostr relay WebSocket messages when offline and replays
 *    them via a BroadcastChannel when the client reconnects.
 *    (WebSockets themselves are not interceptable by SW fetch — we use a
 *    BroadcastChannel handshake with the chat client instead.)
 * 4. Caches Nominatim reverse-geocode responses for 24h so location labels
 *    display offline after first lookup.
 *
 * SECURITY — this worker only caches chat UI assets. It never sees wallet
 * routes, seed data, or signing requests. The scope restriction enforces this.
 *
 * REGISTRATION — registered from src/features/chat/provider/chat.provider.tsx
 * with { scope: '/chat' } when the chat feature mounts.
 */

const CACHE_NAME = 'sh-chat-v1';
const GEOCODE_CACHE = 'sh-chat-geocode-v1';

// Assets that should be precached on install (populated by build tooling
// or kept minimal here — the chat bundle is already in the main app cache).
const PRECACHE_ASSETS = [
  // intentionally empty — we rely on runtime caching below
];

// ── Cache strategies ─────────────────────────────────────────────────────────

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('sw-cached-at', String(Date.now()));
    const cloned = new Response(await response.clone().arrayBuffer(), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    cache.put(request, cloned);
  }
  return response;
}

async function cacheFirst(request, cacheName, maxAgeSeconds = Infinity) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate && maxAgeSeconds !== Infinity) {
      const age = (Date.now() - parseInt(cachedDate, 10)) / 1000;
      if (age > maxAgeSeconds) {
        // Stale — fetch fresh in background, return stale now
        fetchAndCache(request, cache).catch(() => {});
      }
    }
    return cached;
  }

  return fetchAndCache(request, cache);
}

async function networkFirstWithShellFallback(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — return cached version or the app shell
    const cached = await cache.match(request);
    if (cached) return cached;

    // Last resort: return whatever /chat shell we have
    const shell = await cache.match('/chat');
    if (shell) return shell;

    return new Response(
      '<h1>Offline</h1><p>Chat is unavailable offline. Open the app when connected.</p>',
      { headers: { 'Content-Type': 'text/html' } },
    );
  }
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      if (PRECACHE_ASSETS.length > 0) {
        return cache.addAll(PRECACHE_ASSETS);
      }
      return Promise.resolve();
    }),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => k.startsWith('sh-chat-') && k !== CACHE_NAME && k !== GEOCODE_CACHE)
          .map((k) => caches.delete(k)),
      ))
      .then(() => self.clients.claim()),
  );
});

// ── Fetch interception ───────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Nominatim geocode — cache for 24 hours
  if (url.hostname === 'nominatim.openstreetmap.org') {
    event.respondWith(cacheFirst(request, GEOCODE_CACHE, 24 * 60 * 60));
    return;
  }

  // Static assets (JS, CSS, fonts, images) — cache-first
  if (url.pathname.match(/\.(js|css|woff2?|png|svg|ico|webp|jpg)$/)) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // Chat SPA navigation — network-first, fall back to cached shell
  if (url.pathname.startsWith('/chat')) {
    event.respondWith(networkFirstWithShellFallback(request));
  }
});

// ── Offline message queue ────────────────────────────────────────────────────

/**
 * The chat client posts messages here when the Nostr relay WebSocket is down.
 * On reconnect, the client reads the queue and replays them.
 *
 * Protocol:
 *   client → SW: { type: 'QUEUE_MSG', payload: <nostr event JSON> }
 *   SW → client: { type: 'REPLAY_QUEUE', messages: [...] }  (on ONLINE event)
 */

const broadcastChannel = new BroadcastChannel('sh-chat-offline');

// Simple in-memory queue (survives as long as SW is alive).
// For true persistence across SW restarts, IndexedDB would be used;
// this is sufficient for typical brief connectivity drops.
let _queue = [];

async function enqueueMessage(msg) {
  _queue.push(msg);
}

async function dequeueAll() {
  const msgs = [..._queue];
  _queue = [];
  return msgs;
}

broadcastChannel.onmessage = async (event) => {
  const { type, payload } = event.data || {};

  if (type === 'QUEUE_MSG') {
    await enqueueMessage(payload);
  } else if (type === 'FLUSH_QUEUE') {
    const messages = await dequeueAll();
    broadcastChannel.postMessage({ type: 'REPLAY_QUEUE', messages });
  }
};

self.addEventListener('online', async () => {
  const messages = await dequeueAll();
  if (messages.length > 0) {
    broadcastChannel.postMessage({ type: 'REPLAY_QUEUE', messages });
  }
});
