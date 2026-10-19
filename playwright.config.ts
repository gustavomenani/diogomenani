import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;
const baseURL = `http://127.0.0.1:${String(PORT)}`;
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: isCI ? [['github'], ['list']] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'e2e',
      testMatch: 'e2e/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // O build roda antes, no script pretest:e2e; aqui só servimos o dist/.
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${String(PORT)}`,
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
