/* Simple sitemap generator for Netlify/Vite build */
import fs from 'fs';
import path from 'path';

const ORIGIN = 'https://superhero.com';

async function main() {
  const urls: string[] = [];

  // Core routes
  urls.push(`${ORIGIN}/`);
  urls.push(`${ORIGIN}/trends/tokens`);
  urls.push(`${ORIGIN}/defi/swap`);
  urls.push(`${ORIGIN}/terms`);
  urls.push(`${ORIGIN}/privacy`);
  urls.push(`${ORIGIN}/faq`);

  // Note: For dynamic routes (posts, users, tokens), ideally fetch a recent list from the API.
  // Keep static minimal sitemap to avoid slow builds. Edge function ensures proper head for crawlers.

  const xml = buildSitemap(urls);
  const outDir = path.resolve(process.cwd(), 'public');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), xml, 'utf8');
}

function buildSitemap(urls: string[]): string {
  const items = urls
    .map((u) => `  <url>\n    <loc>${escapeXml(u)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`) 
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items}\n</urlset>\n`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>\"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


