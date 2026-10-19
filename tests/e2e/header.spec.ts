import { test, expect, jumpTo, jumpToSection, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const header = (page: Page) => page.locator('[data-header]');
const navLink = (page: Page, name: string) =>
  page.locator('[data-nav]').getByRole('link', { name, exact: true });

test('ganha fundo ao rolar', async ({ page }) => {
  await page.goto('/');
  await expect(header(page)).not.toHaveClass(/is-scrolled/);
  await jumpTo(page, 100);
  await expect(header(page)).toHaveClass(/is-scrolled/);
});

test('recolhe ao descer depois do hero e volta ao subir', async ({ page }) => {
  await page.goto('/');
  await jumpTo(page, 1400);
  await expect(header(page)).toHaveClass(/is-tucked/);
  await jumpTo(page, 1300);
  await expect(header(page)).not.toHaveClass(/is-tucked/);
});

test('marca o link da seção visível', async ({ page }) => {
  await page.goto('/');
  await jumpToSection(page, 'duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  for (const name of ['Sobre', 'Atuação', 'Como trabalho', 'Contato']) {
    await expect(navLink(page, name)).not.toHaveAttribute('aria-current');
  }
});

test('abrir em /#duvidas já marca Dúvidas', async ({ page }) => {
  await page.goto('/#duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
});
