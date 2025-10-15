import { test, expect, resolveExtensionId } from './utils/extensionTest.js';

test('options display mode set to both enables overlay', async ({ context, page, serverBaseURL }) => {
  const extensionId = await resolveExtensionId(context);

  await page.goto(`${serverBaseURL}/media-page.html`, { waitUntil: 'networkidle' });

  const controller = page.locator('#speed-controller');
  await expect(controller).toHaveCount(0);

  const optionsPage = await context.newPage();
  try {
    await optionsPage.goto(`chrome-extension://${extensionId}/options/index.html`);

    const popupRadio = optionsPage.locator('input[name="display-mode"][value="popup"]');
    const bothRadio = optionsPage.locator('input[name="display-mode"][value="both"]');

    await popupRadio.waitFor({ state: 'visible' });
    await expect(popupRadio).toBeChecked();

    await bothRadio.check();
    await expect(bothRadio).toBeChecked();

    await optionsPage.waitForTimeout(300);
  } finally {
    await optionsPage.close();
  }

  await expect(controller).toBeVisible({ timeout: 15_000 });
});
