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
