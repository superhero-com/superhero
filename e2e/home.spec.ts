import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  test('loads and renders app', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Superhero/);
  });
});
