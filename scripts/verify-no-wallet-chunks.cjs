/**
 * Build gate: with `INLINE_WALLET_ENABLED === false`, the production bundle must
 * contain NO inline-wallet code — not in the main chunk, not in a lazy chunk on
 * disk, and not named in `__vite__mapDeps`.
 *
 * Usage:
 *   node scripts/verify-no-wallet-chunks.cjs [dist-dir]     # default: ./dist
 *   npm run verify:no-wallet-chunks
 *
 * Runs automatically at the end of `npm run build`.
 *
 * Why this exists. `INLINE_WALLET_ENABLED` is a literal `false`, so Rollup folds
 * every *call site* of the inline wallet away — the main-chunk delta really is
 * ~0.2 kB and nothing fetches the feature at runtime. But an unconditional
 * `lazy(() => import('…/WalletOnboarding'))` at module scope is an opaque call
 * Rollup must keep, so the *chunks* were still emitted and still listed in
 * `__vite__mapDeps`: `WalletSignPrompt-*.js`, `WalletOnboarding-*.js`,
 * `WalletLab-*.js`, `wallet-lifecycle-*.js` sat in `dist/assets`, publicly
 * retrievable, pre-announcing an unshipped custody feature on the client's
 * origin. The fix is to put each `lazy()` inside the flag ternary; this script is
 * what stops that from silently regressing the next time someone adds an import.
 *
 * Verifying the main chunk alone is exactly the check that missed it the first
 * time, so this script deliberately reads EVERY emitted asset.
 *
 * Two independent layers, because either alone has a blind spot:
 *
 *  1. NAMES — no emitted chunk (and no `__vite__mapDeps` entry) may be named
 *     after an inline-wallet source module. The forbidden list is derived from
 *     `src/features/wallet/` + `src/views/WalletLab.tsx` at run time, so a module
 *     added to the feature tomorrow is covered without editing this file.
 *     Blind spot: code inlined into a chunk with an innocuous name.
 *
 *  2. MARKERS — no emitted asset may contain a string literal unique to the
 *     wallet's crypto/custody stack. Minification renames identifiers but not
 *     string literals, so these survive a production build and catch inlined
 *     code that layer 1 cannot see.
 *
 * If the flag is ever flipped on, this gate is skipped (loudly) rather than
 * failed — turning the feature on is a separate, gated decision (see
 * `src/features/wallet/config.ts`), and shipping its chunks is then correct.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const WALLET_SRC_DIR = path.join(REPO_ROOT, 'src/features/wallet');
const CONFIG_FILE = path.join(WALLET_SRC_DIR, 'config.ts');

/** Extra inline-wallet modules that live outside `src/features/wallet/`. */
const EXTRA_WALLET_MODULES = ['src/views/WalletLab.tsx'];

/**
 * Wallet source basenames excluded from the NAME layer:
 *  - `config`  — the flag module itself. It is meant to ship (it is what makes
 *    the feature dead), and `config-*.js` is far too generic a chunk name to
 *    treat as evidence.
 *  - `types`   — type-only module; it emits no runtime code, and `types-*.js`
 *    from a dependency would be a false positive.
 * Both are still covered by the MARKER layer if they ever gain real code.
 */
const NAME_LAYER_EXCLUDED_STEMS = new Set(['config', 'types']);

/**
 * String literals unique to the inline wallet's custody stack. Chosen because
 * they survive minification and do not occur anywhere else in this bundle —
 * verified empty against a flag-off build.
 */
const WALLET_MARKERS = [
  'superhero-vault-v1', // vault envelope tag (vault-record.ts)
  'inline wallet:', // error-message prefix across the signer/broker
  'argon2id', // passphrase KDF (factors.ts)
  'webauthn-prf', // device-passkey factor (webauthn.ts)
  'hkdf-sha256', // envelope key derivation (vault.ts)
  'recovery-code', // recovery factor (recovery.ts)
];

/**
 * Pre-existing EXTERNAL-wallet surfaces. These are on `develop`, have nothing to
 * do with the inline wallet, and must keep shipping. Listed only so the report
 * names them instead of leaving the reader to wonder about a `Wallet-*.js`.
 */
const EXTERNAL_WALLET_CHUNK_STEMS = ['Wallet', 'WalletConnectBtn', 'ConnectWalletModal'];

/** True when `INLINE_WALLET_ENABLED` is a literal `true` in config.ts. */
function inlineWalletEnabled() {
  const source = fs.readFileSync(CONFIG_FILE, 'utf8');
  const match = source.match(/export\s+const\s+INLINE_WALLET_ENABLED\s*=\s*(true|false)\s*;/);
  if (!match) {
    throw new Error(
      `Could not read INLINE_WALLET_ENABLED as a literal from ${path.relative(REPO_ROOT, CONFIG_FILE)}. `
      + 'That constant must stay a plain literal const — see the rules in that file.',
    );
  }
  return match[1] === 'true';
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) return [full];
    return entry.name === '__tests__' ? [] : walk(full);
  });
}

/** Chunk-name stems Rollup would use for inline-wallet modules, from source. */
function forbiddenStems() {
  const files = walk(WALLET_SRC_DIR)
    .concat(EXTRA_WALLET_MODULES.map((rel) => path.join(REPO_ROOT, rel)).filter(fs.existsSync));
  const stems = files
    .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => path.basename(file).replace(/\.(ts|tsx)$/, ''))
    .filter((stem) => !NAME_LAYER_EXCLUDED_STEMS.has(stem));
  return [...new Set(stems)].sort();
}

/** `WalletLab.js` / `WalletLab-BImI6oAD.js` match `WalletLab`; `WalletLabX` does not. */
function stemOf(fileName) {
  return fileName.replace(/\.(js|css)$/, '').replace(/-[A-Za-z0-9_-]{6,}$/, '');
}

/** Every `assets/...` path listed in a `__vite__mapDeps` array, across all chunks. */
function mapDepsEntries(assets) {
  const entries = assets
    .filter((asset) => asset.file.endsWith('.js'))
    .map((asset) => asset.content.match(/__vite__mapDeps[\s\S]{0,80}?\[([\s\S]*?)\]/))
    .filter(Boolean)
    .flatMap((block) => block[1].match(/["'][^"']*\.(?:js|css)["']/g) || [])
    .map((quoted) => quoted.slice(1, -1));
  return [...new Set(entries)].sort();
}

function main() {
  const distDir = path.resolve(process.argv[2] || path.join(REPO_ROOT, 'dist'));

  if (inlineWalletEnabled()) {
    console.log(
      'SKIP: INLINE_WALLET_ENABLED is true — wallet chunks are expected to ship.\n'
      + '      This gate only applies while the flag is off.',
    );
    return;
  }

  if (!fs.existsSync(distDir)) {
    console.error(`FAIL: ${path.relative(REPO_ROOT, distDir)} does not exist — run \`vite build\` first.`);
    process.exit(1);
  }

  const assets = walk(distDir)
    .filter((file) => /\.(js|css)$/.test(file))
    .map((file) => ({
      file: path.relative(distDir, file),
      content: fs.readFileSync(file, 'utf8'),
    }));

  if (assets.length === 0) {
    console.error(`FAIL: no .js/.css assets found under ${path.relative(REPO_ROOT, distDir)} — nothing was verified.`);
    process.exit(1);
  }

  const stems = forbiddenStems();
  const isWalletStem = (name) => stems.includes(stemOf(path.basename(name)));

  const failures = [
    // Layer 1a — chunk file names on disk.
    ...assets
      .filter((asset) => isWalletStem(asset.file))
      .map((asset) => `chunk on disk: ${asset.file} (inline-wallet module "${stemOf(path.basename(asset.file))}")`),

    // Layer 1b — names listed in `__vite__mapDeps`, whether or not they are on disk.
    ...mapDepsEntries(assets)
      .filter(isWalletStem)
      .map((entry) => `__vite__mapDeps entry: ${entry} (inline-wallet module "${stemOf(path.basename(entry))}")`),

    // Layer 2 — wallet code inlined into any asset, whatever that asset is called.
    ...assets.flatMap((asset) => WALLET_MARKERS
      .filter((marker) => asset.content.includes(marker))
      .map((marker) => `wallet marker ${JSON.stringify(marker)} found in ${asset.file}`)),
  ];

  const scanned = `${assets.length} assets in ${path.relative(REPO_ROOT, distDir) || distDir}`;

  if (failures.length > 0) {
    console.error('FAIL: inline-wallet code is present in the build with INLINE_WALLET_ENABLED = false.\n');
    failures.forEach((failure) => console.error(`  - ${failure}`));
    console.error(
      `\nScanned ${scanned}.\n`
      + 'Most likely cause: a `lazy(() => import(...))` / `await import(...)` of a wallet\n'
      + 'module that is NOT inside an `INLINE_WALLET_ENABLED ? ... : ...` ternary. Rollup\n'
      + 'cannot fold an unconditional import call, so it emits the chunk even though no\n'
      + 'code path reaches it. Put the import behind the literal (see\n'
      + '`src/context/AeSdkProvider.tsx` for the pattern) rather than relaxing this gate.',
    );
    process.exit(1);
  }

  const external = assets
    .map((asset) => path.basename(asset.file))
    .filter((name) => EXTERNAL_WALLET_CHUNK_STEMS.includes(stemOf(name)))
    .sort();

  console.log(`PASS: no inline-wallet chunks, mapDeps entries or code markers. Scanned ${scanned}.`);
  console.log(`      Forbidden module stems (${stems.length}): ${stems.join(', ')}`);
  console.log(`      Markers (${WALLET_MARKERS.length}): ${WALLET_MARKERS.map((m) => JSON.stringify(m)).join(', ')}`);
  if (external.length > 0) {
    console.log(`      Shipped external-wallet chunks (expected, unrelated): ${external.join(', ')}`);
  }
}

try {
  main();
} catch (err) {
  console.error(err.stack || err.message);
  process.exit(1);
}
