import { defineConfig, loadEnv, type Plugin } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  // Load all envs from the app directory (where .env is located)
  const envDir = __dirname;
  const env = loadEnv(mode, envDir, '');
  console.log('[Vite Config] Loading env from:', envDir);
  console.log('[Vite Config] Mode:', mode);
  console.log('[Vite Config] VITE_SUPERHERO_API_URL:', env.VITE_SUPERHERO_API_URL);
  
  return {
    plugins: [react(), svgr()],
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

