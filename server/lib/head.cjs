/* Pure, side-effect-free helpers for the server-side `<head>` SEO injector.
 * Deliberately has no `fs`/network/`app.listen` dependency so it can be unit-tested in
 * isolation from the Express bootstrap in server/index.cjs (which reads dist/index.html
 * and opens a listening socket at require-time). */

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
  }[c]));
}

// Attribute-safe escaper (mirrors netlify/edge-functions/seo.ts escapeAttr): escapeHtml plus
// single-quote encoding, since these values are interpolated into HTML attributes and a raw
// value could otherwise break out of a `content="..."`/`href="..."` attribute.
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

// Safe-for-`<script type="application/ld+json">` JSON serializer — mirrors
// netlify/edge-functions/seo.ts jsonLdSafe. `JSON.stringify` does not escape `<`, `>`, or `/`,
// so a post/bio/token field containing `</script><script>alert(1)</script>` would close the
// JSON-LD script element early and let the remainder execute as a new <script> — a stored XSS.
// HTML entities do not help: the tokenizer scans raw script text for the literal `</script`
// bytes before any entity decoding. We substitute JSON `\uXXXX` escapes, which `JSON.parse`
// decodes back to the original character but which the HTML parser never sees as tag syntax,
// plus U+2028/U+2029 (valid in JSON, but JS line terminators). The backslash and the two
// separators are built with `String.fromCharCode` so a `\`-escape in source is not resolved back
// to the very character at parse time (which would make the replace a silent no-op).
const BACKSLASH = String.fromCharCode(0x5c);
const LINE_SEPARATOR_RE = new RegExp(String.fromCharCode(0x2028), 'g');
const PARAGRAPH_SEPARATOR_RE = new RegExp(String.fromCharCode(0x2029), 'g');

function jsonLdSafe(schema) {
  return JSON.stringify(schema)
    .replace(/</g, `${BACKSLASH}u003C`)
    .replace(/>/g, `${BACKSLASH}u003E`)
    .replace(/\//g, `${BACKSLASH}u002F`)
    .replace(LINE_SEPARATOR_RE, `${BACKSLASH}u2028`)
    .replace(PARAGRAPH_SEPARATOR_RE, `${BACKSLASH}u2029`);
}

function injectHead(html, meta) {
  const parts = [];
  parts.push(`<title>${escapeHtml(meta.title)}</title>`);
  if (meta.description) parts.push(`<meta name="description" content="${escapeHtml(meta.description)}">`);
  if (meta.canonical) parts.push(`<link rel="canonical" href="${escapeAttr(meta.canonical)}">`);
  parts.push('<meta property="og:site_name" content="Superhero">');
  parts.push(`<meta property="og:type" content="${escapeAttr(meta.ogType || 'website')}">`);
  parts.push(`<meta property="og:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta property="og:description" content="${escapeAttr(meta.description)}">`);
  if (meta.canonical) parts.push(`<meta property="og:url" content="${escapeAttr(meta.canonical)}">`);
  parts.push(`<meta property="og:image" content="${escapeAttr(meta.ogImage)}">`);
  parts.push('<meta property="og:image:width" content="1200">');
  parts.push('<meta property="og:image:height" content="630">');
  parts.push('<meta name="twitter:card" content="summary_large_image">');
  parts.push(`<meta name="twitter:title" content="${escapeAttr(meta.title)}">`);
  if (meta.description) parts.push(`<meta name="twitter:description" content="${escapeAttr(meta.description)}">`);
  parts.push(`<meta name="twitter:image" content="${escapeAttr(meta.ogImage)}">`);
  // JSON-LD — parity with netlify/edge-functions/seo.ts. Serialized through jsonLdSafe so
  // user-generated fields (post text, bio, token metadata) cannot break out of the script tag.
  let jsonLdArray = [];
  if (Array.isArray(meta.jsonLd)) jsonLdArray = meta.jsonLd;
  else if (meta.jsonLd) jsonLdArray = [meta.jsonLd];
  jsonLdArray.forEach((schema) => {
    parts.push(`<script type="application/ld+json">${jsonLdSafe(schema)}</script>`);
  });

  const idx = html.indexOf('</head>');
  if (idx === -1) return html;
  // Replace, don't append: index.html ships a static placeholder <title>, so appending the
  // route title left every injected route with two <title> tags. Strip the existing document
  // title from the head region before splicing so exactly one survives.
  const head = html.slice(0, idx).replace(/<title[^>]*>[\s\S]*?<\/title>/i, '');
  return `${head}\n${parts.join('\n')}\n${html.slice(idx)}`;
}

module.exports = { escapeHtml, escapeAttr, jsonLdSafe, injectHead };
