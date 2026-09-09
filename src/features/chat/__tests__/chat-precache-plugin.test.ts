/**
 * Tests for scripts/vite-chat-precache.mjs, which explains why the list exists.
 * What it picks is exactly what a first-time visitor has when they go offline.
 */
import { describe, expect, it } from 'vitest';
import { collectPrecacheAssets, injectPrecache } from '../../../../scripts/vite-chat-precache.mjs';

const chunk = (fileName: string, over: Record<string, unknown> = {}) => ({
  type: 'chunk',
  fileName,
  isEntry: false,
  imports: [],
  moduleIds: [],
  ...over,
});

const CHAT_VIEW = '/repo/src/features/chat/views/DmThreadView.tsx';

describe('collectPrecacheAssets', () => {
  it('takes the entry and everything it statically imports', () => {
    const assets = collectPrecacheAssets({
      'assets/index.js': chunk('assets/index.js', { isEntry: true, imports: ['assets/vendor.js'] }),
      'assets/vendor.js': chunk('assets/vendor.js'),
    });

    expect(assets).toEqual(['/assets/index.js', '/assets/vendor.js']);
  });

  it('takes the chat views, which the shell cannot render without', () => {
    // Lazy routes: nothing static reaches them, so the entry walk alone misses them.
    const assets = collectPrecacheAssets({
      'assets/index.js': chunk('assets/index.js', { isEntry: true }),
      'assets/DmThread.js': chunk('assets/DmThread.js', { moduleIds: [CHAT_VIEW] }),
    });

    expect(assets).toContain('/assets/DmThread.js');
  });

  it('leaves dynamic imports alone', () => {
    const assets = collectPrecacheAssets({
      'assets/index.js': chunk('assets/index.js', {
        isEntry: true,
        dynamicImports: ['assets/wallet.js'],
      }),
      'assets/wallet.js': chunk('assets/wallet.js'),
    });

    expect(assets).toEqual(['/assets/index.js']);
  });

  it('takes the CSS a kept chunk pulls in', () => {
    const assets = collectPrecacheAssets({
      'assets/index.js': chunk('assets/index.js', {
        isEntry: true,
        viteMetadata: { importedCss: new Set(['assets/index.css']) },
      }),
    });

    expect(assets).toContain('/assets/index.css');
  });

  it('matches chat module ids under Windows separators too', () => {
    const assets = collectPrecacheAssets({
      'assets/DmThread.js': chunk('assets/DmThread.js', {
        moduleIds: ['C:\\repo\\src\\features\\chat\\views\\DmThreadView.tsx'],
      }),
    });

    expect(assets).toEqual(['/assets/DmThread.js']);
  });
});

describe('injectPrecache', () => {
  const source = "const BUILD_ID = 'dev';\nconst PRECACHE_ASSETS = [];\n";

  it('writes the list and a build id derived from it', () => {
    const out = injectPrecache(source, ['/assets/index.js']);

    expect(out).toContain('const PRECACHE_ASSETS = ["/assets/index.js"];');
    expect(out).toMatch(/const BUILD_ID = '[0-9a-f]{8}';/);
  });

  it('gives a different build id to a different list, so activate evicts the old cache', () => {
    const a = injectPrecache(source, ['/assets/index-aaa.js']);
    const b = injectPrecache(source, ['/assets/index-bbb.js']);

    expect(a).not.toEqual(b);
  });

  it('throws rather than silently shipping a worker that precaches nothing', () => {
    expect(() => injectPrecache('const BUILD_ID = 1;', [])).toThrow(/markers not found/);
  });
});
