import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

export default defineConfig(({ mode }) => {
  // Load all envs so we can forward both VITE_ and VUE_APP_
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), svgr()],
    // Ensure env is loaded from the monorepo root so .env.* at repo root are picked up
    // Load envs from app directory only to avoid invalid envDir array issue
    envDir: __dirname,
    define: {
      // Expose all envs to process.env for broad compatibility
      'process.env': env,
    },
    server: {
      port: 5173,
      fs: {
        // allow importing icons from the parent Vue project's assets
        allow: [path.resolve(__dirname, '..')],
      },
      proxy: {
        // Proxy governance API to bypass CORS in dev
        '/governance-api': {
          target: 'https://governance.aeternity.com',
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/governance-api/, '/api'),
        },
      },
    },
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react';
              if (id.includes('@reduxjs/toolkit') || id.includes('redux')) return 'vendor-redux';
              if (id.includes('@aeternity')) return 'vendor-ae';
              return 'vendor';
            }
          },
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
    },
  };
});


