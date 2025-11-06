import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Plugin to handle JSON imports from node_modules
const jsonPlugin = (): Plugin => {
  return {
    name: 'json-resolver',
    enforce: 'pre', // Run before Vite's default JSON plugin
    resolveId(id: string, importer?: string) {
      // Only handle JSON imports from dex-contracts-v2
      if (id.endsWith('.json') && id.startsWith('dex-contracts-v2/')) {
        try {
          // Try to resolve using Node's module resolution
          const resolvedPath = require.resolve(id, { paths: [process.cwd(), importer ? path.dirname(importer) : process.cwd()] });
          // Return the resolved path - Vite's JSON plugin will handle loading it
          return resolvedPath;
        } catch (e) {
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
  };
};

export default defineConfig(({ mode }) => {
  // Load all envs so we can forward both VITE_ and VUE_APP_
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), svgr(), jsonPlugin()],
    ssr: {
      noExternal: ['react-helmet-async'],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ['bctsl-sdk'],
    },
    // Ensure env is loaded from the monorepo root so .env.* at repo root are picked up
    // Load envs from app directory only to avoid invalid envDir array issue
    envDir: __dirname,
    define: {
      // Expose all envs to process.env for broad compatibility
      'process.env': env,
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
        },
      },
      // Ensure JSON files are included in the build
      assetsInclude: ['**/*.json'],
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "./src/styles/variables.scss" as *; @use "./src/styles/mixins.scss" as *;`,
        },
      },
    },
    // Accept both prefixes in import.meta.env
    envPrefix: ['VITE_', 'VUE_APP_'],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      testTimeout: 30000,
    },
    
  };
});

