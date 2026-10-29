import { defineConfig, devices } from '@playwright/test';

const port = process.env.E2E_PORT ?? '3200';

// Needs `pnpm build` first. Locally PW_CHANNEL=chrome uses the system Chrome; CI uses bundled Chromium.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } }],
  webServer: {
    command: 'node scripts/e2e-server.mjs',
    url: `http://localhost:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { E2E_PORT: port },
  },
});
