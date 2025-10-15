import { test as base, expect, chromium } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.resolve(__dirname, '../../extension');
const fixturesDir = path.resolve(__dirname, '../fixtures');

let server;
let baseURL;

const serverHandler = (req, res) => {
  const visit = async () => {
    const requestPath = req.url && req.url !== '/' ? req.url.split('?')[0] : '/media-page.html';
    const filePath = path.join(fixturesDir, requestPath);
    try {
      const file = await fs.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.js'
            ? 'text/javascript; charset=utf-8'
            : ext === '.css'
              ? 'text/css; charset=utf-8'
              : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(file);
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      console.error('[test-server] Failed to serve', requestPath, error);
      res.writeHead(500);
      res.end('Internal server error');
    }
  };

  visit().catch((error) => {
    console.error('[test-server] Unexpected failure', error);
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end('Internal error');
  });
};

const extended = base.extend({
  context: async ({}, use) => {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'speedmaster-ext-'));
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--allow-file-access-from-files',
        '--mute-audio'
      ]
    });
    await use(context);
    await context.close();
    await fs.rm(userDataDir, { recursive: true, force: true });
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  }
});

async function resolveExtensionId(context) {
  const workers = context.serviceWorkers();
  if (workers.length) {
    return new URL(workers[0].url()).host;
  }
  const worker = await context.waitForEvent('serviceworker', {
    timeout: 15_000
  });
  return new URL(worker.url()).host;
}

async function enableOverlay(context, extensionId) {
  const optionsPage = await context.newPage();
  await optionsPage.goto(`chrome-extension://${extensionId}/options/index.html`);
  const overlayRadio = optionsPage.locator('input[name="display-mode"][value="both"]');
  await overlayRadio.waitFor({ state: 'visible' });
  if (!(await overlayRadio.isChecked())) {
    await overlayRadio.check();
    await optionsPage.waitForTimeout(250);
  }
  await optionsPage.close();
}

extended.beforeAll(async () => {
  server = http.createServer(serverHandler);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  baseURL = `http://127.0.0.1:${port}`;
});

extended.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

extended('controller overlay adjusts playback speed', async ({ context, page }) => {
  const extensionId = await resolveExtensionId(context);
  await enableOverlay(context, extensionId);

  await page.goto(`${baseURL}/media-page.html`, { waitUntil: 'networkidle' });

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
