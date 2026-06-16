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
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
