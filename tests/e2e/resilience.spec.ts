import { test, expect, countHiddenReveals, jumpTo } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('sem o módulo da página, todo o conteúdo aparece', async ({ page }) => {
  // O módulo não chega (rede, bloqueio): a página volta ao modo sem script.
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('/');
  const root = page.locator('[data-page]');
  await expect(root).toHaveAttribute('data-motion', 'pending');
  expect(await countHiddenReveals(page)).toBe(0);
  // mata: o data-fallback do script inline (o header, fixo e transparente, sumia sobre as seções
  // brancas)
  await expect(root).toHaveAttribute('data-fallback', '');
  await expect(page.locator('[data-header]')).toHaveCSS('position', 'absolute');
});

test.describe('sem o módulo da página, no celular', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('o botão Menu some, e os botões do WhatsApp continuam', async ({ page }) => {
    // O Menu depende do módulo: sem ele, o toque não abriria nada.
    await page.route('**/_astro/*.js', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('[data-page]')).toHaveAttribute('data-fallback', '');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    await expect(page.locator('[data-wa-cta]')).toBeVisible();
  });
});

test('com o módulo da página, a raiz não ganha data-fallback', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const root = page.locator('[data-page]');
  await expect(root).toHaveAttribute('data-ready', '');
  await expect(root).not.toHaveAttribute('data-fallback');
  await expect(page.locator('[data-header]')).toHaveCSS('position', 'fixed');
});

test('uma revelação que falha não derruba o resto da página', async ({ page }) => {
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
  const answer = page.getByText('Sim, o atendimento é somente online.');
  await expect(answer).toBeVisible();
  await expect(answer).toHaveCSS('opacity', '1');
  await jumpTo(page, 100);
  await expect(page.locator('[data-header]')).toHaveClass(/is-scrolled/);

  await page.locator('label[for="tema-consumidor"]').click();
  await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText('Fale sobre consumo');

  expect(errors).toEqual([expect.stringContaining('revelação')]);
});
