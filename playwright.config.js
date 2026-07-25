import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Some environments (e.g. sandboxed containers) ship a system Chromium instead
// of the version-matched browser Playwright would download. Use it only when
// explicitly pointed at via PW_EXECUTABLE_PATH or when the known local build
// exists — CI/dev machines with a standard `playwright install` are unaffected.
const LOCAL_CHROMIUM = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const chromiumExecutablePath =
  process.env.PW_EXECUTABLE_PATH ||
  (fs.existsSync(LOCAL_CHROMIUM) ? LOCAL_CHROMIUM : undefined);

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...(chromiumExecutablePath
      ? {
          launchOptions: {
            executablePath: chromiumExecutablePath,
            // Required when running as root in the container sandbox.
            args: ['--no-sandbox'],
          },
        }
      : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
