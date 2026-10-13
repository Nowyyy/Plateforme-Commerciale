import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.e2e.js',
  outputDir: 'test-results',
  webServer: {
    command: 'node tests/outils/serveur.mjs',
    url: 'http://localhost:4173/',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:4173/',
    launchOptions: { executablePath: process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium' },
  },
});
