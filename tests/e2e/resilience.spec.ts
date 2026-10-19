import { test, expect, countHiddenReveals, jumpTo } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('sem o módulo da página, todo o conteúdo aparece', async ({ page }) => {
  // O módulo não chega (rede, bloqueio): a página volta ao modo sem script.
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('[data-page]')).toHaveAttribute('data-motion', 'pending');
  expect(await countHiddenReveals(page)).toBe(0);
});

test('uma revelação que falha não derruba o resto da página', async ({ page, openedUrls }) => {
  // Um navegador sem IntersectionObserver, ou um erro no código da revelação.
  await page.addInitScript(() => {
    window.IntersectionObserver = function () {
      throw new Error('IntersectionObserver indisponível');
    } as unknown as typeof IntersectionObserver;
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  expect(await countHiddenReveals(page)).toBe(0);
  const answer = page.getByText('Sim. Reuniões podem ser feitas por videochamada');
  await expect(answer).toBeVisible();
  await expect(answer).toHaveCSS('opacity', '1');
  await jumpTo(page, 100);
  await expect(page.locator('[data-header]')).toHaveClass(/is-scrolled/);

  await page.getByLabel('Nome', { exact: true }).fill('Ana Souza');
  await page.getByLabel('WhatsApp', { exact: true }).fill('18997017249');
  await page.getByLabel('Mensagem', { exact: true }).fill('Fui demitida sem receber as verbas.');
  await page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }).check();
  await page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }).click();
  await expect.poll(openedUrls).toEqual([expect.stringMatching(/^https:\/\/wa\.me\//)]);

  expect(errors).toEqual([expect.stringContaining('revelação')]);
});

test('um formulário incompleto não derruba o resto da página', async ({ page }) => {
  // Serve a página sem o campo "Nome": o formulário fica sem script, o resto segue funcionando.
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<input[^>]*name="nome"[^>]*>/, '');
    await route.fulfill({ response, body: html });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('input[name="nome"]')).toHaveCount(0);
  await jumpTo(page, 100);
  await expect(page.locator('[data-header]')).toHaveClass(/is-scrolled/);
  expect(errors).toEqual([]);
});
