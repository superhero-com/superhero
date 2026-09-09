/**
 * The Content-Security-Policy served by server/index.cjs.
 *
 * Enforcing CSP + Trusted Types is the backstop in front of seed custody: injected script must
 * not be able to reach the vault. `script-src 'strict-dynamic' 'nonce-…'` (no unsafe-inline)
 * plus `require-trusted-types-for 'script'` forces every markup and script-URL sink through
 * src/utils/trustedTypes.ts.
 *
 * Kept out of index.cjs so scripts/check-csp-origins.cjs can diff the allowlist against the
 * built bundle, and so the directives can be asserted directly in tests.
 */

const CSP_REPORT_PATH = '/_csp-report';

/** Origin of a URL, or `null` when it does not parse. */
function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
}

// Deploy-time overrides this server already envsubst's into window.__SUPERCONFIG__ (see
// envInject in index.cjs). Reading them here too means connect-src self-adjusts to whatever
// origins the running container is pointed at, instead of drifting from a hardcoded snapshot
// of src/config.ts's mainnet/testnet defaults whenever ops repoints an env var.
const RUNTIME_CONNECT_ENV_KEYS = [
  'BACKEND_URL', 'SUPERHERO_API_URL', 'SUPERHERO_WS_URL', 'NODE_URL', 'WALLET_URL',
  'MIDDLEWARE_URL', 'DEX_BACKEND_URL', 'MAINNET_DEX_BACKEND_URL', 'TESTNET_DEX_BACKEND_URL',
  'GOVERNANCE_API_URL', 'EXPLORER_URL',
];

// The mainnet/testnet API/middleware/node/DEX/governance/compiler origins from src/config.ts,
// plus the third-party origins the app calls directly: the CORS proxies (LinkPreviewCard), the
// Twitter oEmbed existence check (TwitterCard — publish.twitter.com 30x's to publish.x.com, so
// both must be listed), and the GitHub/Openverse integrations.
const CONNECT_SRC_ALLOWLIST = [
  "'self'",
  'https://api.superhero.com', 'wss://api.superhero.com',
  'https://testnet.api.dev.tokensale.org', 'wss://testnet.api.dev.tokensale.org',
  'https://mdw.wordcraft.fun',
  'https://testnet.aeternity.io',
  'https://v7.compiler.aepps.com',
  'https://dex-backend-mainnet.prd.service.aepps.com',
  'https://dex-backend-testnet.prd.service.aepps.com',
  'https://governance-server-mainnet.prd.service.aepps.com',
  'https://governance-server-testnet.prd.service.aepps.com',
  'https://api.codetabs.com',
  'https://api.allorigins.win',
  'https://publish.twitter.com',
  'https://publish.x.com',
  'https://api.github.com',
  'https://api.openverse.org',
];

// The AE<->ETH bridge and Buy-AE widget. Their routes redirect to /defi/swap (src/routes.tsx),
// so the code is tree-shaken out of the bundle and these origins stay off the header. Turn
// AE_ETH_BRIDGE_ENABLED on in the same change that restores those routes: Ethplorer is a literal
// in our own source, but the Reown/WalletConnect origins live inside @reown/appkit-common, so
// nothing in src/ reveals them and the wallet modal would come up empty.
// pulse.walletconnect.org is deliberately excluded — AppKit still posts INITIALIZE and
// CONNECT_SUCCESS there despite `analytics: false`, and blocking it costs no functionality.
const BRIDGE_CONNECT_SRC = [
  'https://api.ethplorer.io',
  'https://api.web3modal.org',
  'wss://relay.walletconnect.org',
  'https://rpc.walletconnect.org',
];
const BRIDGE_FRAME_SRC = ['https://verify.walletconnect.org'];

/**
 * Mirrors the scheme guard in src/features/chat/nostr/relay-url.ts, so the header and the
 * client's origin gate accept exactly the same set — a relay one allows and the other refuses
 * would leave chat holding a relay it can never open.
 */
function isSecureRelayUrl(url) {
  try {
    const { protocol, hostname } = new URL(url);
    if (protocol === 'wss:') return true;
    return protocol === 'ws:' && ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  } catch { return false; }
}

// Relays arrive as one comma-separated env var (the P2P default plus whatever groups_relay
// origin the API hands out), so unlike the single-URL keys it is split before mapping —
// originOf() returns null on the whole comma string.
function relayConnectOrigins(env) {
  return String(env.NOSTR_RELAY_URLS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(isSecureRelayUrl)
    .map(originOf)
    .filter(Boolean);
}

// Superhero's own chat relay, allowed unconditionally because it is also the built-in default
// in src/config.ts (COMMON_CONFIG.NOSTR_RELAY_URLS). Without it here, a container started with
// no NOSTR_RELAY_URLS would serve a client that knows the relay while the CSP forbids it — chat
// would render and every socket would be blocked at connect time, which reads as "chat is
// broken" rather than "chat is misconfigured".
//
// KEEP IN SYNC with COMMON_CONFIG.NOSTR_RELAY_URLS. e2e/chat-availability.spec.ts asserts every
// relay the client advertises appears in connect-src.
const CHAT_RELAY_ALLOWLIST = ['wss://relay.superhero.chat'];

/**
 * Resolve the policy for one process. Env is fixed for the life of the server, so index.cjs
 * calls this once at startup rather than rebuilding the directives on every response.
 */
function createCspPolicy(env = process.env) {
  const bridgeEnabled = env.AE_ETH_BRIDGE_ENABLED === 'true';

  const connectSrc = Array.from(new Set([
    ...CONNECT_SRC_ALLOWLIST,
    ...(bridgeEnabled ? BRIDGE_CONNECT_SRC : []),
    ...RUNTIME_CONNECT_ENV_KEYS.map((k) => originOf(env[k])).filter(Boolean),
    ...CHAT_RELAY_ALLOWLIST,
    ...relayConnectOrigins(env),
  ])).join(' ');

  // Jitsi's host is deploy-configurable (CONFIG.JITSI_DOMAIN / $JITSI_DOMAIN) — read the same
  // env var this server envsubst's into the page so the two stay in sync.
  const frameSrc = [
    'https://platform.twitter.com',
    'https://www.youtube-nocookie.com',
    'https://open.spotify.com',
    `https://${env.JITSI_DOMAIN || 'meet.jit.si'}`,
    ...(bridgeEnabled ? BRIDGE_FRAME_SRC : []),
  ].join(' ');

  const buildCsp = (nonce) => [
    "default-src 'none'",
    `script-src 'strict-dynamic' 'nonce-${nonce}'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https: data: blob:",
    "media-src 'self' https: data: blob:",
    "font-src 'self' data:",
    "manifest-src 'self'",
    `connect-src ${connectSrc}`,
    `frame-src ${frameSrc}`,
    // Without this, worker URLs fall through to script-src, where 'strict-dynamic' permits any
    // script-initiated request and Trusted Types is the only thing left constraining them.
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "require-trusted-types-for 'script'",
    // superhero-dom: the audited first-party writer; default: the deny-markup safety net for
    // implicit third-party sinks (e.g. Radix Select's static <style>). See src/utils/trustedTypes.ts.
    'trusted-types superhero-dom default',
    'upgrade-insecure-requests',
    // Both spellings on purpose: report-to is the modern one, report-uri is what Firefox and
    // older Chrome still read. Browsers that understand report-to ignore report-uri.
    'report-to csp-endpoint',
    `report-uri ${CSP_REPORT_PATH}`,
  ].join('; ');

  return { buildCsp, connectSrc, frameSrc };
}

module.exports = {
  CSP_REPORT_PATH,
  CONNECT_SRC_ALLOWLIST,
  CHAT_RELAY_ALLOWLIST,
  BRIDGE_CONNECT_SRC,
  BRIDGE_FRAME_SRC,
  RUNTIME_CONNECT_ENV_KEYS,
  createCspPolicy,
  isSecureRelayUrl,
  originOf,
};
