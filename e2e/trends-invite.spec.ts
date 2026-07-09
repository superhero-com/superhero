import { test, expect } from '@playwright/test';

test.describe('trends invite page', () => {
  // Suppress the first-visit welcome modal so the screenshot is deterministic.
  // It auto-opens 500ms after mount for logged-out visitors (App.tsx), which
  // races the screenshot capture and renders differently across environments.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding:skip', 'true');
    });
  });

  test('matches screenshot', async ({ page }) => {
    await page.goto('/trends/invite');
    await expect(page.locator('#root')).toBeVisible();
    await page.waitForLoadState('load');

    await expect(page).toHaveScreenshot('trends-invite.png', { fullPage: true });
  });
});
