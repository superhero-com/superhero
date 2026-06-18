import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Screenshot capture suite.
 * No assertions — tests never fail due to visual differences.
 * Screenshots are saved to e2e-screenshots/ and uploaded as CI artifacts.
 */

const VIEWPORTS = [
  { name: 'iphone-xs', width: 375, height: 812 },
  { name: 'ipad', width: 768, height: 1024 },
  { name: 'laptop', width: 1280, height: 800 },
  { name: '1080p', width: 1920, height: 1080 },
  { name: '2k', width: 2560, height: 1440 },
];

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'trends-invite', path: '/trends/invite' },
];

const OUTPUT_DIR = path.join(process.cwd(), 'e2e-screenshots');

test.describe('page screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Prevent the first-visit welcome modal from appearing.
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding:skip', 'true');
    });
  });

  VIEWPORTS.forEach((viewport) => {
    PAGES.forEach((pageConfig) => {
      test(`${pageConfig.name} @ ${viewport.name} (${viewport.width}×${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(pageConfig.path);
        expect(response?.status(), `${pageConfig.path} should return HTTP 200`).toBe(200);
        await page.locator('#root').waitFor({ state: 'visible' });
        await page.waitForLoadState('load');

        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        await page.screenshot({
          path: path.join(OUTPUT_DIR, `${pageConfig.name}--${viewport.name}.png`),
          fullPage: true,
        });
      });
    });
  });
});
