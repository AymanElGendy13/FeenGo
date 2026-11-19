import { defineConfig, devices } from '@playwright/test';

// Playwright tests for the partner dashboard: web-dev's own checks and the
// screenshots for design review. Journeys across both websites live in
// tests/e2e/web (qa-tester).
//
// Run `pnpm build` first: the tests start the standalone production server.
//
// PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH points Playwright at a Chromium that is
// already installed, for machines without the browser build that matches the
// pinned @playwright/test. Leave it unset to use Playwright's own browser (CI).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const port = Number(process.env.PARTNER_WEB_E2E_PORT ?? 3101);
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
  ],
  webServer: {
    command: 'node scripts/start-standalone.ts',
    env: { PORT: String(port) },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
