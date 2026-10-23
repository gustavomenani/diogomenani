import { fileURLToPath } from 'node:url';
import { test, expect, jumpTo, type Locator, type Page } from '../e2e/fixtures';

// Regressão visual com movimento reduzido: tudo já aparece revelado. Da rolagem só dependem o
// header e o botão flutuante (escondidos nas seções, com capturas próprias) e o título grudado
// de Atuação, que o Playwright sempre rola até o mesmo ponto. Os snapshots são do Windows; depois
// de uma mudança visual intencional, gere de novo com `npm run test:visual -- --update-snapshots`.

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/** Nas capturas de seção, os elementos fixos (header, botão flutuante, skip link) somem. */
const HIDE_FIXED = { stylePath: fileURLToPath(new URL('hide-fixed.css', import.meta.url)) };

interface Section {
  name: string;
  locate: (page: Page) => Locator;
  /** Partes que mudam sem mudança de código e ficam cobertas na captura. */
  mask?: (page: Page) => Locator[];
}

const SECTIONS: Section[] = [
  { name: 'inicio', locate: (page) => page.locator('#inicio') },
  { name: 'sobre', locate: (page) => page.locator('#sobre') },
  { name: 'atuacao', locate: (page) => page.locator('#atuacao') },
  { name: 'como-trabalhamos', locate: (page) => page.locator('#como-trabalhamos') },
  { name: 'manifesto', locate: (page) => page.getByRole('region', { name: 'Compromissos' }) },
  { name: 'duvidas', locate: (page) => page.locator('#duvidas') },
  { name: 'contato', locate: (page) => page.locator('#contato') },
  {
    name: 'footer',
    locate: (page) => page.getByRole('contentinfo'),
    // O ano do copyright vem do build: sem a máscara, a captura falharia a cada virada de ano.
    mask: (page) => [page.getByRole('contentinfo').getByText(/^©/)],
  },
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

for (const viewport of [MOBILE, DESKTOP]) {
  const size = viewport.width;

  test.describe(`seções em ${size} px`, { tag: '@visual' }, () => {
    test.use({ viewport, reducedMotion: 'reduce' });

    test('header', async ({ page }) => {
      await expect(page.getByRole('banner')).toHaveScreenshot(`header-${size}.png`);
    });

    test('header rolado', async ({ page }) => {
      const header = page.getByRole('banner');
      await jumpTo(page, 200);
      await expect(header).toHaveClass(/is-scrolled/);
      await expect(header).toHaveScreenshot(`header-rolado-${size}.png`);
    });

    for (const { name, locate, mask } of SECTIONS) {
      test(name, async ({ page }) => {
        await expect(locate(page)).toHaveScreenshot(`${name}-${size}.png`, {
          ...HIDE_FIXED,
          mask: mask?.(page) ?? [],
        });
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

  test('dúvidas com a segunda pergunta aberta', async ({ page }) => {
    const second = page.getByRole('button', { name: 'O atendimento pode ser totalmente online?' });
    await second.click();
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    // A captura é do estado aberto, e não do hover: o mouse sai de cima da pergunta.
    await page.mouse.move(0, 0);
    await expect(page.locator('#duvidas')).toHaveScreenshot(
      'duvidas-segunda-aberta-1440.png',
      HIDE_FIXED,
    );
  });
});
