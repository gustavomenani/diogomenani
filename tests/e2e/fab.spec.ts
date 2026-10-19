import { test, expect, jumpTo, jumpToSection } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('o botão flutuante aparece depois do hero e some perto do contato', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  await expect(fab).not.toHaveClass(/is-visible/);
  await jumpTo(page, 1500);
  await expect(fab).toHaveClass(/is-visible/);
  await jumpToSection(page, 'contato');
  await expect(fab).not.toHaveClass(/is-visible/);
});
