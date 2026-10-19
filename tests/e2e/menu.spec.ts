import { test, expect, type Page } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

const toggle = (page: Page) => page.locator('[data-menu-toggle]');
const menuLink = (page: Page, name: string) =>
  page.locator('[data-menu]').getByRole('link', { name, exact: true });
const rootOverflow = (page: Page) => page.evaluate(() => document.documentElement.style.overflow);

async function openMenu(page: Page): Promise<void> {
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
  // O foco só vai para o primeiro link depois da abertura; esperar por ele estabiliza os testes.
  await expect(menuLink(page, 'Sobre')).toBeFocused();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('abre e fecha pelo botão', async ({ page }) => {
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await openMenu(page);
  await toggle(page).click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Esc fecha e devolve o foco ao botão', async ({ page }) => {
  await openMenu(page);
  await page.keyboard.press('Escape');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle(page)).toBeFocused();
});

test('Tab no último item volta ao botão', async ({ page }) => {
  await openMenu(page);
  await menuLink(page, 'Agendar uma conversa').focus();
  await page.keyboard.press('Tab');
  await expect(toggle(page)).toBeFocused();
});

test('clicar num link fecha o menu e navega', async ({ page }) => {
  await openMenu(page);
  await menuLink(page, 'Dúvidas').click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(/#duvidas$/);
});

test('trava a rolagem só enquanto está aberto', async ({ page }) => {
  expect(await rootOverflow(page)).toBe('');
  await openMenu(page);
  expect(await rootOverflow(page)).toBe('hidden');
  await toggle(page).click();
  await expect.poll(() => rootOverflow(page)).toBe('');
});

test('virar desktop fecha o menu', async ({ page }) => {
  await openMenu(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  expect(await rootOverflow(page)).toBe('');
});
