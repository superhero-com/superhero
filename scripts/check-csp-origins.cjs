#!/usr/bin/env node
/**
 * Fails the build when the bundle can reach an origin `connect-src` does not allow.
 *
 * The allowlist used to be assembled by grepping src/ for literal URLs, which cannot see an
 * origin that only exists inside a dependency. That asymmetry was real: api.ethplorer.io is a
 * literal in our own bridge code and was listed, while the Reown/WalletConnect origins the same
 * feature needs live in @reown/appkit-common and were not. Scanning the built bundle instead
 * catches both, because whatever survived tree-shaking is what the browser can actually run.
 *
 *   node scripts/check-csp-origins.cjs
 */

const fs = require('fs');
const path = require('path');
const {
  CONNECT_SRC_ALLOWLIST, CHAT_RELAY_ALLOWLIST, BRIDGE_CONNECT_SRC, BRIDGE_FRAME_SRC,
  RUNTIME_CONNECT_ENV_KEYS,
  createCspPolicy, originOf,
} = require('../server/lib/csp.cjs');

const DIST_ASSETS = path.resolve(__dirname, '..', 'dist', 'assets');

// Origins that appear in the bundle as link targets or as documentation strings inside
// dependencies. Neither is a fetch, so neither belongs in connect-src. Anything reaching this
// list should be a host we deliberately send users *to*, never one we talk to.
const NAVIGATION_ONLY = new Set([
  'https://aescan.io', 'https://www.aescan.io', 'https://testnet.aescan.io',
  'https://explorer.aeternity.io', 'https://forum.aeternity.com', 'https://superhero.com',
  'https://wallet.superhero.com', 'https://github.com', 'https://t.me', 'https://twitter.com',
  'https://x.com', 'https://apps.apple.com', 'https://play.google.com',
  'https://chrome.google.com', 'https://chromewebstore.google.com', 'https://addons.mozilla.org',
  'https://changelly.com', 'https://swapspace.co', 'https://swapzone.io', 'https://www.gate.io',
  'https://bit.ly', 'https://quali.chat', 'https://app.quali.chat',
]);

// Strings baked into third-party packages (docs links, JSON-LD vocabulary, placeholder hosts in
// error messages). They are never requested.
const LIBRARY_NOISE = new Set([
  'https://airbnb.io', 'https://links.ethers.org', 'https://react.dev',
  'https://react.i18next.com', 'https://reactrouter.com', 'https://redux-toolkit.js.org',
  'https://redux.js.org', 'https://schema.org', 'https://socket.io',
  'https://www.tradingview.com', 'https://yoursite.com', 'wss://relay.example.com',
]);

const URL_RE = /(https|wss):\/\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.[a-zA-Z]{2,}/g;

// The relay catalog in relays.ts is a description table for the relay-settings screen, not a
// connection list: isAllowedRelayOrigin() refuses any relay NOSTR_RELAY_URLS does not name, and
// when it does name one, relayConnectOrigins() puts it on the header. Read the table out of
// source rather than restating it here, so adding a relay label cannot break this check.
function relayCatalogOrigins() {
  const file = path.resolve(__dirname, '..', 'src', 'features', 'chat', 'nostr', 'relays.ts');
  if (!fs.existsSync(file)) return new Set();
  const source = fs.readFileSync(file, 'utf8');
  return new Set(
    [...source.matchAll(/'(wss:\/\/[^']+)'/g)].map((m) => originOf(m[1])).filter(Boolean),
  );
}

function bundleOrigins() {
  if (!fs.existsSync(DIST_ASSETS)) {
    console.error(`[csp] no build to check at ${DIST_ASSETS} — run \`npm run build\` first.`);
    process.exit(2);
  }
  const origins = new Set();
  for (const file of fs.readdirSync(DIST_ASSETS)) {
    if (!file.endsWith('.js') && !file.endsWith('.css')) continue;
    const source = fs.readFileSync(path.join(DIST_ASSETS, file), 'utf8');
    for (const match of source.matchAll(URL_RE)) {
      const origin = originOf(match[0]);
      if (origin) origins.add(origin);
    }
  }
  return origins;
}

// Everything the header could permit under any deploy config: the bridge origins count as
// covered even while the feature is off, otherwise re-enabling it would trip this check.
function permittedOrigins() {
  const { frameSrc } = createCspPolicy({ ...process.env, AE_ETH_BRIDGE_ENABLED: 'true' });
  return new Set([
    ...CONNECT_SRC_ALLOWLIST, ...CHAT_RELAY_ALLOWLIST, ...BRIDGE_CONNECT_SRC, ...BRIDGE_FRAME_SRC,
    ...frameSrc.split(' '),
    ...RUNTIME_CONNECT_ENV_KEYS.map((k) => originOf(process.env[k])).filter(Boolean),
  ]);
}

const permitted = permittedOrigins();
const relayCatalog = relayCatalogOrigins();
const unlisted = [...bundleOrigins()]
  .filter((o) => !permitted.has(o) && !NAVIGATION_ONLY.has(o) && !LIBRARY_NOISE.has(o)
    && !relayCatalog.has(o))
  .sort();

if (unlisted.length > 0) {
  console.error('[csp] origins in the bundle that connect-src does not permit:\n');
  for (const origin of unlisted) console.error(`  ${origin}`);
  console.error(
    '\nAdd each to CONNECT_SRC_ALLOWLIST in server/lib/csp.cjs if the app fetches it, or to'
    + '\nNAVIGATION_ONLY in this script if it is only ever a link target.\n',
  );
  process.exit(1);
}

console.log(`[csp] ok — every fetchable origin in the bundle is permitted (${permitted.size} allowed).`);
