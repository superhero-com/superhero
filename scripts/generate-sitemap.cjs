// Simple sitemap generator for Netlify/Vite build (CommonJS, no deps)
const fs = require('fs');
const path = require('path');

const ORIGIN = 'https://superhero.com';

function main() {
  const urls = [];

  // Core routes
  urls.push(`${ORIGIN}/`);
  urls.push(`${ORIGIN}/trends/tokens`);
  urls.push(`${ORIGIN}/defi/swap`);
  urls.push(`${ORIGIN}/terms`);
  urls.push(`${ORIGIN}/privacy`);
  urls.push(`${ORIGIN}/faq`);

  const xml = buildSitemap(urls);
  const outDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8');
}

function buildSitemap(urls) {
  const items = urls
    .map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`) 
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function escapeXml(s) {
  return s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

main();


