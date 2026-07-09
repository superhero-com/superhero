import { test, expect } from '@playwright/test';

/**
 * Screenshot capture suite.
 * Screenshots are attached to the Playwright test so the HTML report embeds them.
 * Tests only fail on HTTP errors, not visual differences.
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

test.describe('page screenshots', () => {
  test.beforeEach(async ({ page }) => {
    // Prevent the first-visit welcome modal from appearing.
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding:skip', 'true');
    });
  });

  VIEWPORTS.forEach((viewport) => {
    PAGES.forEach((pageConfig) => {
      test(`${pageConfig.name} @ ${viewport.name} (${viewport.width}×${viewport.height})`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        const response = await page.goto(pageConfig.path);
        expect(response?.status(), `${pageConfig.path} should return HTTP 200`).toBe(200);
        await page.locator('#root').waitFor({ state: 'visible' });
        await page.waitForLoadState('load');
        await page.waitForTimeout(3000);

        const screenshot = await page.screenshot({ fullPage: true, type: 'jpeg', quality: 80 });
        await testInfo.attach(`${pageConfig.name}--${viewport.name}.jpg`, {
          body: screenshot,
          contentType: 'image/jpeg',
        });
      });
    });
  });
});
