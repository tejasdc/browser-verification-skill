import { defineConfig, devices } from '@playwright/test';

// Mobile + laptop, Chromium + WebKit, all headless on Linux. See references/playwright-setup.md.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['json', { outputFile: 'test-results/results.json' }], ['html', { open: 'never' }]],
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled', caret: 'hide', stylePath: './tests/e2e/snapshot-freeze.css' },
  },
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    { name: 'Desktop Chrome', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }, dependencies: ['setup'] },
    { name: 'Desktop Safari', use: { ...devices['Desktop Safari'] }, dependencies: ['setup'] },
    { name: 'Pixel 7', use: { ...devices['Pixel 7'] }, dependencies: ['setup'] },
    { name: 'iPhone 14', use: { ...devices['iPhone 14'] }, dependencies: ['setup'] },
  ],
});
