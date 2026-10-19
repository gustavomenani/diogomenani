import { test, expect, jumpTo, jumpToSection, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const header = (page: Page) => page.locator('[data-header]');
const navLink = (page: Page, name: string) =>
  page.locator('[data-nav]').getByRole('link', { name, exact: true });

/** Rola até o topo da seção ficar a `top` px do topo da tela, sem animação. */
async function placeSection(page: Page, id: string, top: number): Promise<void> {
  await page.evaluate(
    ([sectionId, offset]) => {
      const section = document.getElementById(sectionId);
      if (!section) throw new Error(`seção #${sectionId} não existe`);
      window.scrollBy({ top: section.getBoundingClientRect().top - offset, behavior: 'instant' });
    },
    [id, top] as const,
  );
}

/** A barra de progresso mostra a fração rolada da página com a altura atual. */
const progressMatchesScroll = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>('[data-progress]');
    const scale = Number(/scaleX\(([\d.]+)\)/.exec(bar?.style.transform ?? '')?.[1]);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    return Math.abs(scale - window.scrollY / max) < 0.001;
  });

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

test('o foco que um toque deixa no botão do menu não impede o header de recolher', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await jumpTo(page, 2000);
  await expect(header(page)).toHaveClass(/is-tucked/);
});

test('marca o link da seção visível', async ({ page }) => {
  await page.goto('/');
  await jumpToSection(page, 'duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  for (const name of ['Sobre', 'Atuação', 'Como trabalho', 'Contato']) {
    await expect(navLink(page, name)).not.toHaveAttribute('aria-current');
  }
});

test('uma resposta do FAQ que abre sem rolar atualiza o link ativo e a barra', async ({ page }) => {
  await page.goto('/');
  // Contato a 340 px do topo: já passou da linha de 40% da tela (360 px) e é a seção ativa.
  await placeSection(page, 'contato', 340);
  await expect(navLink(page, 'Contato')).toHaveAttribute('aria-current', 'true');
  // A resposta empurra o contato para baixo da linha: Dúvidas volta a ser a seção ativa.
  await page.getByRole('button', { name: 'O que eu contar fica em sigilo?' }).click();
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  await expect.poll(() => progressMatchesScroll(page)).toBe(true);
});

test.describe('com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('o header também recolhe ao descer, sem deslizar', async ({ page }) => {
    await page.goto('/');
    await expect(header(page)).not.toHaveCSS('transition-property', /transform/);
    await jumpTo(page, 1400);
    await expect(header(page)).toHaveClass(/is-tucked/);
    await jumpTo(page, 1300);
    await expect(header(page)).not.toHaveClass(/is-tucked/);
  });
});

test('abrir em /#duvidas já marca Dúvidas e revela a seção', async ({ page }) => {
  await page.goto('/#duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#duvidas [data-reveal]').first()).toHaveClass(/is-in/);
});
