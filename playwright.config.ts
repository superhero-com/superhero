import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  forbidOnly: !!process.env.CI,
  // Allow a small per-screenshot pixel budget so full-page visual snapshots
  // don't flake on sub-pixel font anti-aliasing (a real text/layout change
  // diffs far more than this). Bump if a legit UI change needs a new baseline.
  expect: {
    toHaveScreenshot: { maxDiffPixels: 100 },
  },
  timeout: 60_000,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    // VITE_WEBAUTHN_RP_ID is pinned into the bundle at build time and is never
    // derived from window.location (src/features/wallet/webauthn.ts), so it
    // defaults to superhero.com — which is not a registrable suffix of
    // localhost, and every passkey ceremony against this server would fail with
    // a SecurityError before reaching any product logic. Pin it to the origin
    // these tests actually run on.
    command: 'VITE_WEBAUTHN_RP_ID=localhost npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
