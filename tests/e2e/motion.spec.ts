import { test, expect, countHiddenReveals, jumpTo, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Pose nivelada da balança: travessão a −22,620° no pivô e pratos compensando. */
const LEVEL_POSE = ['rotate(-22.620 225 273)', 'rotate(22.620 161 281)', 'rotate(22.620 281 331)'];

const balancePose = (page: Page) =>
  page.evaluate(() =>
    ['[data-beam]', '[data-pan-l]', '[data-pan-r]'].map(
      (selector) => document.querySelector(selector)?.getAttribute('transform') ?? null,
    ),
  );

test.describe('com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('o erro de um campo aparece sem deslocamento', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }).click();
    const error = page.getByText('Informe seu nome.', { exact: true });
    await expect(error).toBeVisible();
    await expect(error).toHaveCSS('animation-name', 'fade');
  });

  test('o indicador da navegação troca de link sem deslizar', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-nav-ind]')).not.toHaveCSS('transition-property', /transform/);
  });

  test('com movimento reduzido tudo aparece de cara', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'reduced');
    const reveals = page.locator('[data-reveal]');
    const count = await reveals.count();
    expect(count).toBeGreaterThan(20);
    for (let i = 0; i < count; i++) await expect(reveals.nth(i)).toHaveClass(/is-in/);
  });

  test('no modo reduzido a balança já começa nivelada', async ({ page }) => {
    await page.goto('/');
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
  });
});

test.describe('com movimento', () => {
  test('com movimento o conteúdo revela ao entrar na tela', async ({ page }) => {
    await page.goto('/');
    const title = page.getByRole('heading', { name: 'Vamos conversar sobre o seu caso?' });
    await expect(title).not.toHaveClass(/is-in/);
    await title.scrollIntoViewIfNeeded();
    await expect(title).toHaveClass(/is-in/);
  });

  test('a balança termina nivelada', async ({ page }) => {
    // Relógio do Playwright: a física avança em tempo simulado, sem depender da taxa de quadros.
    await page.clock.install();
    await page.goto('/');
    await page.clock.runFor(10_000);
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
    // Continua igual depois: a animação parou de fato, não só passou pela pose.
    await page.clock.runFor(1_000);
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
  });
});

test.describe('com a preferência trocada com a página aberta', () => {
  /** Transições de revelação em andamento. */
  const revealTransitions = (page: Page) =>
    page.evaluate(
      () =>
        document
          .getAnimations()
          .filter(
            (animation) =>
              animation instanceof CSSTransition &&
              animation.effect instanceof KeyframeEffect &&
              animation.effect.target?.closest('[data-reveal]'),
          ).length,
    );
  const figureTransform = (page: Page) =>
    page.locator('[data-figure]').evaluate((figure) => figure.style.transform);

  test('ligar "reduzir movimento" vale na hora, e desligar também', async ({ page }) => {
    const root = page.locator('[data-page]');
    await page.goto('/');
    await jumpTo(page, 300);
    await expect.poll(() => figureTransform(page)).toContain('translate3d');
    // A balança começa a balançar aos 950 ms: a preferência muda no meio do balanço.
    await expect.poll(async () => (await balancePose(page))[0]).toMatch(/^rotate/);
    expect(await balancePose(page)).not.toEqual(LEVEL_POSE);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(root).toHaveAttribute('data-motion', 'reduced');
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
    expect(await figureTransform(page)).toBe('');
    // O que ainda não tinha aparecido aparece de uma vez, sem transição.
    expect(await countHiddenReveals(page)).toBe(0);
    expect(await revealTransitions(page)).toBe(0);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(root).toHaveAttribute('data-motion', 'on');
    await jumpTo(page, 200);
    await expect.poll(() => figureTransform(page)).toContain('translate3d');
    expect(await countHiddenReveals(page)).toBe(0);
  });
});

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('sem JavaScript todo o conteúdo fica visível', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'pending');
    await expect(page.getByText('Sim. O sigilo profissional é um dever do advogado')).toBeVisible();
    expect(await countHiddenReveals(page)).toBe(0);
  });
});
