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
  // Os snapshots visuais são do Windows, e as fontes renderizam diferente em cada sistema: no CI
  // (Linux) a suíte @visual fica de fora.
  ...(isCI ? { grepInvert: /@visual/ } : {}),
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
    {
      name: 'visual',
      testMatch: 'visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      snapshotPathTemplate: '{testDir}/visual/__screenshots__/{platform}/{arg}{ext}',
      expect: {
        toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
      },
    },
  ],
  // O build roda antes, nos scripts pretest:e2e e pretest:visual; aqui só servimos o dist/.
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${String(PORT)}`,
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
