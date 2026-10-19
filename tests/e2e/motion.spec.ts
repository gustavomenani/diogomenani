import { test, expect, type Page } from './fixtures';

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
    await page.goto('/');
    await expect.poll(() => balancePose(page), { timeout: 15_000 }).toEqual(LEVEL_POSE);
    // Continua igual depois: a animação parou de fato, não só passou pela pose.
    await page.waitForTimeout(1000);
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
  });
});

test.describe('sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('sem JavaScript todo o conteúdo fica visível', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'pending');
    await expect(page.getByText('Sim. O sigilo profissional é um dever do advogado')).toBeVisible();
  });
});
