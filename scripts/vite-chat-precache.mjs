/**
 * Build-time precache list for `public/chat-offline-sw.js`.
 *
 * A worker controls nothing until it activates, so the entry bundle of the visit
 * that installed it was fetched before the cache existed. Offline afterwards the
 * shell booted into <script> tags that missed and the page stayed blank. The
 * worker cannot name those files itself — they are content-hashed — so the list
 * is computed from the bundle here.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SW_FILE = 'chat-offline-sw.js';
const ASSETS_MARKER = /^const PRECACHE_ASSETS = \[\];$/m;
const BUILD_ID_MARKER = /^const BUILD_ID = '[^']*';$/m;

/** Rollup ids are absolute and use OS separators on Windows. */
const isChatModule = (id) => id.replace(/\\/g, '/').includes('/src/features/chat/');

/**
 * The entry chunk, the chat views, and everything those statically import.
 *
 * Static only: a dynamic import is a route the user may never open, and following
 * them would pull the whole app — wallet included — into a chat-only cache.
 */
export function collectPrecacheAssets(bundle) {
  const chunks = new Map();
  Object.values(bundle).forEach((file) => {
    if (file.type === 'chunk') chunks.set(file.fileName, file);
  });

  const wanted = new Set();
  const walk = (fileName) => {
    if (wanted.has(fileName)) return;
    wanted.add(fileName);
    const chunk = chunks.get(fileName);
    if (!chunk) return;
    (chunk.imports || []).forEach(walk);
    (chunk.viteMetadata?.importedCss || []).forEach((css) => wanted.add(css));
  };

  chunks.forEach((chunk) => {
    if (chunk.isEntry || (chunk.moduleIds || []).some(isChatModule)) walk(chunk.fileName);
  });

  return [...wanted].sort().map((fileName) => `/${fileName}`);
}

/**
 * Exported rather than inlined so the worker's own tests patch the source exactly
 * as the build does — which is what stops these markers and the declarations in
 * the worker from drifting apart.
 */
export function injectPrecache(source, assets) {
  if (!ASSETS_MARKER.test(source) || !BUILD_ID_MARKER.test(source)) {
    throw new Error(`${SW_FILE}: precache markers not found — did the declarations change?`);
  }
  // Derived from the list so the cache name changes exactly when its contents do.
  const buildId = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 8);
  return source
    .replace(BUILD_ID_MARKER, `const BUILD_ID = '${buildId}';`)
    .replace(ASSETS_MARKER, `const PRECACHE_ASSETS = ${JSON.stringify(assets)};`);
}

export function chatPrecache() {
  let outDir = 'dist';
  let assets = [];

  return {
    name: 'chat-precache',
    apply: 'build',

    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },

    generateBundle(_options, bundle) {
      assets = collectPrecacheAssets(bundle);
    },

    closeBundle() {
      // Vite copies public/ in `renderStart`, so the worker is already in outDir
      // and this rewrite is the last write to it.
      const target = path.join(outDir, SW_FILE);
      try {
        writeFileSync(target, injectPrecache(readFileSync(target, 'utf8'), assets));
      } catch (error) {
        // Failing the build beats shipping a worker that precaches nothing: the
        // gap it closes only shows up offline, where nobody is watching.
        this.error(`chat-precache: ${error.message}`);
      }
    },
  };
}
