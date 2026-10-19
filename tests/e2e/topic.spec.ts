import { test, expect, wa, MESSAGES } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('escolher um tema troca link e rótulo do botão principal', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  await expect(cta).toHaveText('Agendar uma conversa');

  await page.getByText('Consumidor', { exact: true }).click();

  await expect(page.getByLabel('Consumidor', { exact: true })).toBeChecked();
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('Direito do Consumidor')));
  await expect(cta).toHaveText('Conversar sobre consumo');
});

test('cliques rápidos não sobrepõem animações e terminam no último tema', async ({ page }) => {
  await page.goto('/');
  const cta = page.locator('[data-wa-cta]');
  for (const topic of ['Família', 'Trabalho', 'Empresas']) {
    await page.getByText(topic, { exact: true }).click({ delay: 0 });
  }
  const runningOnLabel = await cta
    .locator('[data-wa-label]')
    .evaluate(
      (label) =>
        label.getAnimations().filter((animation) => animation.playState === 'running').length,
    );
  expect(runningOnLabel).toBeLessThanOrEqual(1);
  await expect(cta).toHaveText('Conversar sobre empresas');
  await expect(cta).toHaveAttribute('href', wa(MESSAGES.topic('Assessoria para Empresas')));
});
