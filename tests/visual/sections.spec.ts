import { fileURLToPath } from 'node:url';
import { test, expect, jumpTo, type Locator, type Page } from '../e2e/fixtures';

// Regressão visual com movimento reduzido: tudo já aparece revelado e, fora do header e do botão
// flutuante, nada depende da rolagem. Os snapshots são do Windows; depois de uma mudança visual
// intencional, gere de novo com `npm run test:visual -- --update-snapshots`.

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/** Nas capturas de seção, os elementos fixos (header, botão flutuante, skip link) somem. */
const HIDE_FIXED = { stylePath: fileURLToPath(new URL('hide-fixed.css', import.meta.url)) };

const SECTIONS: { name: string; locate: (page: Page) => Locator }[] = [
  { name: 'inicio', locate: (page) => page.locator('#inicio') },
  { name: 'sobre', locate: (page) => page.locator('#sobre') },
  { name: 'atuacao', locate: (page) => page.locator('#atuacao') },
  { name: 'como-trabalho', locate: (page) => page.locator('#como-trabalho') },
  { name: 'manifesto', locate: (page) => page.getByRole('region', { name: 'Compromissos' }) },
  { name: 'duvidas', locate: (page) => page.locator('#duvidas') },
  { name: 'contato', locate: (page) => page.locator('#contato') },
  { name: 'footer', locate: (page) => page.getByRole('contentinfo') },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

for (const viewport of [MOBILE, DESKTOP]) {
  const size = String(viewport.width);

  test.describe(`seções em ${size} px`, { tag: '@visual' }, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    test('header', async ({ page }) => {
      await expect(page.getByRole('banner')).toHaveScreenshot(`header-${size}.png`);
    });

    for (const { name, locate } of SECTIONS) {
      test(name, async ({ page }) => {
        await expect(locate(page)).toHaveScreenshot(`${name}-${size}.png`, HIDE_FIXED);
      });
    }
  });
}

test.describe('estados em 390 px', { tag: '@visual' }, () => {
  test.use({ viewport: MOBILE, reducedMotion: 'reduce' });

  test('menu aberto', async ({ page }) => {
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible();
    await expect(page).toHaveScreenshot('menu-aberto-390.png');
  });

  test('botão flutuante', async ({ page }) => {
    const fab = page.locator('[data-fab]');
    await jumpTo(page, 1500);
    await expect(fab).toHaveClass(/is-visible/);
    await expect(fab).toHaveScreenshot('fab-390.png');
  });
});

test.describe('estados em 1440 px', { tag: '@visual' }, () => {
  test.use({ viewport: DESKTOP, reducedMotion: 'reduce' });

  test('erros do formulário', async ({ page }) => {
    await page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }).click();
    await expect(page.getByText('Revise os campos destacados para continuar.')).toBeVisible();
    await expect(page.locator('#contato')).toHaveScreenshot('contato-erros-1440.png', HIDE_FIXED);
  });

  test('dúvidas com a segunda pergunta aberta', async ({ page }) => {
    const second = page.getByRole('button', { name: 'O atendimento pode ser totalmente online?' });
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#duvidas')).toHaveScreenshot(
      'duvidas-segunda-aberta-1440.png',
      HIDE_FIXED,
    );
  });
});
