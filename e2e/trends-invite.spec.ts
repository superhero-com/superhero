import { test, expect } from '@playwright/test';

test.describe('trends invite page', () => {
  test('matches screenshot', async ({ page }) => {
    await page.goto('/trends/invite');
    await expect(page.locator('#root')).toBeVisible();
    await page.waitForLoadState('load');

    await expect(page).toHaveScreenshot('trends-invite.png', { fullPage: true });
  });
});
