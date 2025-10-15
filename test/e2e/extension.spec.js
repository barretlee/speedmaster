import { test, expect, resolveExtensionId, enableOverlay } from './utils/extensionTest.js';

test('controller overlay adjusts playback speed', async ({ context, page, serverBaseURL }) => {
  const extensionId = await resolveExtensionId(context);
  await enableOverlay(context, extensionId);

  await page.goto(`${serverBaseURL}/media-page.html`, { waitUntil: 'networkidle' });

  const controller = page.locator('#speed-controller');
  await controller.waitFor({ state: 'visible', timeout: 15_000 });

  const speedDisplay = page.locator('#speed-display');
  await expect(speedDisplay).toHaveText('1.00x');

  await page.click('#speed-up');
  await expect(speedDisplay).toHaveText('1.25x');

  await page.click('#skip-ads');
  await expect(speedDisplay).toHaveText('15.00x');

  await page.click('#speed-reset');
  await expect(speedDisplay).toHaveText('1.00x');
});
