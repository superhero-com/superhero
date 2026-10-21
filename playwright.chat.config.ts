import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'chat-delivery.spec.ts',
  workers: 1,
  timeout: 180_000,
  reporter: 'list',
  outputDir: process.env.CHAT_TEST_OUTPUT || '/tmp/superhero-chat-playwright',
  use: { baseURL: 'http://localhost:5186', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
  webServer: {
    command: 'VITE_NOSTR_RELAY_URLS=ws://127.0.0.1:18777 VITE_WEBAUTHN_RP_ID=localhost npm run dev -- --host 127.0.0.1 --port 5186 --strictPort',
    url: 'http://localhost:5186',
    reuseExistingServer: false,
  },
});
