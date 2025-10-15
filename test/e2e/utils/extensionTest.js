import { test as base, expect, chromium } from '@playwright/test';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionPath = path.resolve(__dirname, '../../../extension');
const fixturesDir = path.resolve(__dirname, '../../fixtures');

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

export const test = base.extend({
  server: [
    async ({}, use) => {
      const server = http.createServer(serverHandler);
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      try {
        await use(server);
      } finally {
        await new Promise((resolve) => server.close(resolve));
      }
    },
    { scope: 'worker', auto: true }
  ],
  serverBaseURL: [
    async ({ server }, use) => {
      const address = server.address();
      if (!address || typeof address !== 'object') {
        throw new Error('Unable to determine server address');
      }
      const url = `http://127.0.0.1:${address.port}`;
      await use(url);
    },
    { scope: 'worker', auto: true }
  ],
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
    try {
      await use(context);
    } finally {
      await context.close();
      await fs.rm(userDataDir, { recursive: true, force: true });
    }
  },
  page: async ({ context }, use) => {
    const page = await context.newPage();
    try {
      await use(page);
    } finally {
      await page.close();
    }
  }
});

export { expect };

export async function resolveExtensionId(context) {
  const workers = context.serviceWorkers();
  if (workers.length) {
    return new URL(workers[0].url()).host;
  }
  const worker = await context.waitForEvent('serviceworker', {
    timeout: 15_000
  });
  return new URL(worker.url()).host;
}

export async function enableOverlay(context, extensionId) {
  const optionsPage = await context.newPage();
  try {
    await optionsPage.goto(`chrome-extension://${extensionId}/options/index.html`);
    const overlayRadio = optionsPage.locator('input[name="display-mode"][value="both"]');
    await overlayRadio.waitFor({ state: 'visible' });
    if (!(await overlayRadio.isChecked())) {
      await overlayRadio.check();
      await optionsPage.waitForTimeout(250);
    }
  } finally {
    await optionsPage.close();
  }
}
