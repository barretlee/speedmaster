import { test, expect, resolveExtensionId } from './utils/extensionTest.js';

async function overrideActiveTabQuery(page, urlPattern) {
  await page.addInitScript(({ pattern }) => {
    if (!chrome?.tabs?.query) return;
    const originalQuery = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = (queryInfo, callback) => {
      const shouldOverride = queryInfo?.active && queryInfo?.currentWindow;
      if (!shouldOverride) {
        return originalQuery(queryInfo, callback);
      }
      const promise = originalQuery({ url: pattern })
        .then((tabs) => {
          if (Array.isArray(tabs) && tabs.length > 0) {
            return [tabs[0]];
          }
          return originalQuery(queryInfo);
        })
        .catch(() => originalQuery(queryInfo));
      if (typeof callback === 'function') {
        promise.then((tabs) => callback(tabs));
        return;
      }
      return promise;
    };
  }, { pattern: urlPattern });
}

test('popup toggles overlay visibility', async ({ context, page, serverBaseURL }) => {
  const extensionId = await resolveExtensionId(context);

  await page.goto(`${serverBaseURL}/media-page.html`, { waitUntil: 'networkidle' });

  const controller = page.locator('#speed-controller');
  await expect(controller).toHaveCount(0);

  const popupPage = await context.newPage();
  await overrideActiveTabQuery(popupPage, `${serverBaseURL}/*`);

  try {
    await popupPage.goto(`chrome-extension://${extensionId}/popup/index.html`);

    const overlayButton = popupPage.locator('#open-overlay');
    await overlayButton.waitFor({ state: 'visible' });
    await expect(overlayButton).toBeEnabled();

    await overlayButton.click();

    await expect(controller).toBeVisible({ timeout: 15_000 });
    await expect(overlayButton).toHaveAttribute('data-mode', 'on');

    await overlayButton.click();

    await expect(controller).toHaveCount(0);
    await expect(overlayButton).toHaveAttribute('data-mode', 'off');
  } finally {
    await popupPage.close();
  }
});
