import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

test('the Shorts frame resizes with the feed before video metadata is available', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 640 });
  await page.setContent(`
    <style>* { box-sizing: border-box }</style>
    <div class="shorts-app shorts-watching"><div class="sv-viewer">
      <header class="sv-toolbar"></header>
      <div class="sv-stage"><div class="sv-scroll"><article class="sv-slide">
        <div class="sv-composition">
          <div class="sv-frame"><video></video></div>
          <div class="sv-actions"></div>
        </div>
      </article></div></div>
    </div></div>
  `);
  const css = new URL('../src/features/shorts/shorts-viewer.css', import.meta.url);
  await page.addStyleTag({ path: fileURLToPath(css) });
  const frame = page.locator('.sv-frame');

  const expectPortraitAt = async (height: number) => {
    await page.setViewportSize({ width: 1440, height });
    await expect(frame).toBeVisible();
    await expect.poll(() => frame.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return Math.abs(box.width - Math.min(520, box.height * (9 / 16)));
    })).toBeLessThan(1);
  };

  await expectPortraitAt(640);
  await expectPortraitAt(900);
  await expectPortraitAt(1080);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(frame).toHaveCSS('width', '390px');
});
