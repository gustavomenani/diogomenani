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

test('uma resposta do FAQ que empurra o contato para baixo traz o botão de volta', async ({
  page,
}) => {
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  // Contato a 600 px do topo, acima de 80% da tela (675 px): o botão some.
  await page.evaluate(() => {
    const contact = document.getElementById('contato');
    if (!contact) throw new Error('seção #contato não existe');
    window.scrollBy({ top: contact.getBoundingClientRect().top - 600, behavior: 'instant' });
  });
  await expect(fab).not.toHaveClass(/is-visible/);
  await page.getByRole('button', { name: 'O que eu contar fica em sigilo?' }).click();
  await expect(fab).toHaveClass(/is-visible/);
});
