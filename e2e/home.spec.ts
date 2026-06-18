import { test, expect } from '@playwright/test';

test.describe('home page', () => {
  // Keep the first-visit welcome modal from auto-opening (App.tsx) during tests.
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('onboarding:skip', 'true');
    });
  });

  test('loads and renders app', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#root')).toBeVisible();
  });

  test('has correct page title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Superhero/);
  });
});
