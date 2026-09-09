/**
 * CI/pre-deploy gate: verifies the PWA manifest + icons are served with the
 * correct Content-Type from a running origin.
 *
 * Usage:
 *   node scripts/verify-pwa-assets.cjs <base-url>
 *   npm run verify:pwa-assets -- http://localhost:5174
 *   node scripts/verify-pwa-assets.cjs https://staging.superhero.com
 *
 * Why this checks Content-Type and NEVER HTTP status: `public/_redirects`
 * (`/* /index.html 200`) and the Express SPA fallback in `server/index.cjs`
 * both mean a typo'd or missing asset path still returns *200*, with
 * `Content-Type: text/html` (the SPA shell), not a 404. A status-code check
 * would happily pass a missing icon. Content-Type is the only signal that
 * actually distinguishes "the real file" from "the SPA fallback pretending
 * to be the real file" -- that distinction is the entire point of this
 * script, so status codes are not consulted for pass/fail at all.
 */

const ASSETS = [
  { path: '/manifest.webmanifest', expectedType: 'application/manifest+json' },
  { path: '/icons/icon-192.png', expectedType: 'image/png' },
  { path: '/icons/icon-512.png', expectedType: 'image/png' },
  { path: '/icons/icon-maskable-512.png', expectedType: 'image/png' },
  { path: '/icons/apple-touch-icon-180.png', expectedType: 'image/png' },
];

function usage() {
  console.error('Usage: node scripts/verify-pwa-assets.cjs <base-url>');
  console.error('  e.g. node scripts/verify-pwa-assets.cjs http://localhost:5174');
}

async function checkAsset(baseUrl, { path: assetPath, expectedType }) {
  const url = new URL(assetPath, baseUrl).toString();
  let response;
  try {
    response = await fetch(url, { redirect: 'follow' });
  } catch (err) {
    return {
      url, ok: false, detail: `request failed: ${err.message}`,
    };
  }
  const rawContentType = response.headers.get('content-type') || '';
  // Strip a trailing `; charset=...` before comparing.
  const contentType = rawContentType.split(';')[0].trim().toLowerCase();
  const ok = contentType === expectedType;
  const detail = ok
    ? `Content-Type: ${rawContentType} (HTTP ${response.status})`
    : `expected Content-Type "${expectedType}", got "${rawContentType || '(none)'}" (HTTP ${response.status})`;
  return {
    url, ok, detail,
  };
}

async function main() {
  const baseUrl = process.argv[2];
  if (!baseUrl) {
    usage();
    process.exit(1);
  }

  console.log(`Verifying PWA assets against ${baseUrl}\n`);

  const results = await Promise.all(ASSETS.map((asset) => checkAsset(baseUrl, asset)));

  let allOk = true;
  results.forEach((result) => {
    const status = result.ok ? 'PASS' : 'FAIL';
    if (!result.ok) allOk = false;
    console.log(`[${status}] ${result.url}\n       ${result.detail}`);
  });

  console.log('');
  if (!allOk) {
    console.error('One or more PWA assets failed the Content-Type check. See FAIL lines above.');
    console.error(
      'Note: a 200 status alone does NOT mean the file exists -- the SPA fallback returns '
      + '200 + text/html for any missing path. That is exactly what this script catches.',
    );
    process.exit(1);
  }

  console.log('All PWA assets served with correct Content-Type.');
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
