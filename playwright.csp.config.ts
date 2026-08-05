import { defineConfig, devices } from '@playwright/test';

// Dedicated config for the CSP / Trusted Types soak (e2e/csp.spec.ts). The enforcing header
// only exists on the production Express path (server/index.cjs), NOT on the Vite dev server the
// main playwright.config.ts drives — so this config builds the app and serves it through that
// same server, then walks the routes under the real `Content-Security-Policy` header.
//
//   npm run test:e2e:csp

const PORT = 4319;

export default defineConfig({
  testDir: './e2e',
  testMatch: /csp\.spec\.ts$/,
  forbidOnly: !!process.env.CI,
  timeout: 120_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    navigationTimeout: 60_000,
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    // Build once if dist is missing, then serve dist through the production CSP path.
    command: `sh -c '[ -f dist/index.html ] || npm run build; PORT=${PORT} node server/index.cjs'`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
