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
  const idx = html.indexOf('</head>');
  if (idx === -1) return html;
  return `${html.slice(0, idx)}\n${parts.join('\n')}\n${html.slice(idx)}`;
}

module.exports = { escapeHtml, escapeAttr, injectHead };
