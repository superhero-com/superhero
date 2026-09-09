/* Which requests must never be answered with the SPA document.
 *
 * Answering a script/style/font request with `text/html` is what lets a service worker cache the
 * shell under a `.js` URL (nosniff then refuses to execute it), and what would keep a DELETED
 * worker installed forever -- its update fetch gets HTML, the browser rejects the script on MIME
 * grounds, and the old worker stays active with no way to evict it. A real 404 unregisters it.
 *
 * Split out of index.cjs so the classification is testable on its own: a false positive here turns
 * a live route into a 404, which no route-walk in the e2e suite would attribute to this rule.
 */

const SUBRESOURCE_EXT_RE = /\.(?:js|mjs|cjs|css|map|woff2?|ttf|otf|eot)$/i;
const SUBRESOURCE_DESTS = new Set(['script', 'serviceworker', 'style', 'font', 'worker', 'sharedworker']);

/**
 * `req.path` with percent-escapes resolved. serve-static decodes before resolving, so a raw
 * `/index%2Ehtml` matches no literal route here yet reaches index.html there. A malformed escape
 * throws, and the raw path is then the honest thing to match on.
 */
function decodedPath(rawPath) {
  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/**
 * `Sec-Fetch-Dest` is absent on older browsers and on curl, so the extension test carries those
 * cases. A navigation is `document` and matches neither branch.
 */
function isSubresourceRequest(pathname, secFetchDest) {
  return SUBRESOURCE_EXT_RE.test(pathname) || SUBRESOURCE_DESTS.has(secFetchDest);
}

module.exports = { decodedPath, isSubresourceRequest };
