import { defineConfig, loadEnv, type Plugin } from 'vite';
import path, { resolve } from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

import { existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Plugin to handle JSON imports from node_modules
const jsonPlugin = (): Plugin => ({
  name: 'json-resolver',
  enforce: 'pre', // Run before Vite's default JSON plugin
  resolveId(id: string, importer?: string) {
    // Only handle JSON imports from dex-contracts-v2
    if (id.endsWith('.json') && id.startsWith('dex-contracts-v2/')) {
      try {
        // Try to resolve using Node's module resolution
        const resolvedPath = require.resolve(id, {
          paths: [process.cwd(), importer ? path.dirname(importer) : process.cwd()],
        });
        // Return the resolved path - Vite's JSON plugin will handle loading it
        return resolvedPath;
      } catch {
        // If require.resolve fails, try manual resolution
        const parts = id.split(/[/\\]/);
        const packageName = parts[0];
        const filePath = parts.slice(1).join('/');
        const fullPath = resolve(process.cwd(), 'node_modules', packageName, filePath);
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }
    }
    return null; // Let Vite handle other JSON files
  },
  // Don't override load - let Vite's JSON plugin handle it
});

export default defineConfig(({ mode }) => {
  // Load all envs from the app directory (where .env is located)
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, '');
  return {
    plugins: [react(), svgr(), jsonPlugin()],
    ssr: {
      noExternal: ['react-helmet-async'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {},

    // Ensure env is loaded from the app directory
    // Vite will automatically expose VITE_* vars to import.meta.env
    envDir,
    define: {
      // Define process.env for compatibility - use object mapping to allow runtime access
      'process.env': env,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
        output: {
          // Split heavy, self-contained vendor libraries into their own
          // chunks so they can be cached independently and kept out of the
          // main bundle. Only leaf libraries are grouped here (they depend on
          // React but nothing in the synchronous entry depends on them), which
          // avoids module init-order issues from splitting React's own graph.
          manualChunks(id: string) {
            if (!id.includes('node_modules')) return undefined;

            if (
              id.includes('lightweight-charts')
              || id.includes('recharts')
              || id.includes('@visx')
              || id.includes('/d3-')
            ) {
              return 'charts';
            }

            if (
              id.includes('katex')
              || id.includes('react-markdown')
              || id.includes('remark')
              || id.includes('rehype')
              || id.includes('micromark')
              || id.includes('mdast')
              || id.includes('hast')
            ) {
              return 'markdown';
            }

            if (
              id.includes('@reown')
              || id.includes('@walletconnect')
              || id.includes('@ethersproject')
              || id.includes('/ethers/')
            ) {
              return 'web3';
            }

            if (id.includes('@aeternity')) {
              return 'aeternity';
            }

            return undefined;
          },
        },
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          loadPaths: [__dirname],
          additionalData: [
            '@use "src/styles/variables.scss" as *;',
            '@use "src/styles/mixins.scss" as *;',
          ].join(' '),
        },
      },
    },
    // Accept both prefixes in import.meta.env
    envPrefix: ['VITE_', 'VUE_APP_'],
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      setupFiles: './vitest.setup.ts',
      testTimeout: 30000,
      pool: 'forks',
      poolOptions: {
        forks: {
          singleFork: true,
        },
      },
      clearMocks: true,
      restoreMocks: true,
      unstubGlobals: true,
      unstubEnvs: true,
    },

  };
});
