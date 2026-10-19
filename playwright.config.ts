import { defineConfig, devices } from '@playwright/test';

// Porta própria: a 4321 é a do astro dev/preview, e um servidor aberto à mão seria reusado.
const PORT = 4329;
const baseURL = `http://127.0.0.1:${PORT}`;
const isCI = Boolean(process.env.CI);
const E2E = 'e2e/**/*.spec.ts';

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
  // O comportamento roda nos três motores dos navegadores-alvo; o visual, só no Chromium.
  projects: [
    { name: 'chromium', testMatch: E2E, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: E2E, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: E2E, use: { ...devices['Desktop Safari'] } },
    {
      name: 'visual',
      testMatch: 'visual/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      snapshotPathTemplate: '{testDir}/visual/__screenshots__/{platform}/{arg}{ext}',
      // Fora do Windows não há snapshots de referência: sem isto, a primeira rodada gravaria
      // imagens novas e as seguintes passariam sem comparar nada.
      ignoreSnapshots: process.platform !== 'win32',
      expect: {
        toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css' },
      },
    },
  ],
  // `npm run test:e2e` e `npm run test:visual` geram o build antes; `npx playwright test` sozinho
  // serve o dist/ que já existir.
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !isCI,
  },
});
