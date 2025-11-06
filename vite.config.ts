import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
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

// Plugin to help resolve bctsl-sdk package entry point
// This is needed because the package.json may have incorrect main/module/exports
const bctslSdkResolver = (): Plugin => {
  return {
    name: 'bctsl-sdk-resolver',
    enforce: 'pre',
    resolveId(id: string) {
      // Only handle bctsl-sdk package resolution
      if (id === 'bctsl-sdk') {
        try {
          // Try to resolve the package using Node's resolution
          const packageJsonPath = resolve(process.cwd(), 'node_modules/bctsl-sdk/package.json');
          if (existsSync(packageJsonPath)) {
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
            // Try to resolve the main entry point
            const mainEntry = packageJson.main || packageJson.exports?.['.']?.default || './.build/cjs/index.js';
            const resolvedPath = resolve(process.cwd(), 'node_modules/bctsl-sdk', mainEntry);
            if (existsSync(resolvedPath)) {
              return resolvedPath;
            }
            // Fallback: try common paths
            const fallbackPaths = [
              resolve(process.cwd(), 'node_modules/bctsl-sdk/.build/cjs/index.js'),
              resolve(process.cwd(), 'node_modules/bctsl-sdk/.build/esm/index.js'),
              resolve(process.cwd(), 'node_modules/bctsl-sdk/index.js'),
            ];
            for (const fallbackPath of fallbackPaths) {
              if (existsSync(fallbackPath)) {
                return fallbackPath;
              }
            }
          }
        } catch (e) {
          // If resolution fails, let Vite handle it normally
          console.warn('[bctsl-sdk-resolver] Failed to resolve bctsl-sdk:', e);
        }
      }
      return null; // Let Vite handle other packages
    },
  };
};

export default defineConfig(({ mode }) => {
  // Load all envs from the app directory (where .env is located)
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, '');
  console.log('[Vite Config] Loading env from:', envDir);
  console.log('[Vite Config] Mode:', mode);
  console.log('[Vite Config] VITE_SUPERHERO_API_URL:', env.VITE_SUPERHERO_API_URL);
  
  return {
    plugins: [react(), svgr(), jsonPlugin(), bctslSdkResolver()],
    ssr: {
      noExternal: ['react-helmet-async'],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {},

    // Ensure env is loaded from the app directory
    // Vite will automatically expose VITE_* vars to import.meta.env
    envDir: envDir,
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

