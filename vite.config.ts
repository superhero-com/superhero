import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  // Load all envs so we can forward both VITE_ and VUE_APP_
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), svgr()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
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


