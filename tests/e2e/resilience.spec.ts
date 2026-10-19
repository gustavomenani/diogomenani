import { test, expect, jumpTo } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

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
