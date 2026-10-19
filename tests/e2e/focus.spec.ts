import { test, expect, nextFrames, type Locator, type Page } from './fixtures';

// No Safari o Tab não passa por links (padrão da plataforma): o teclado aqui é o do Chromium e o
// do Firefox, que rola menos ao focar.
test.skip(({ browserName }) => browserName === 'webkit', 'no Safari o Tab não passa por links');

/** Cartões das áreas de atuação, empilhados em coluna em qualquer largura. */
const areaCards = (page: Page) => page.locator('#atuacao li');

/** Rola até o topo do elemento ficar a `top` px do topo da tela, sem animação. */
async function placeAt(element: Locator, top: number): Promise<void> {
  await element.evaluate((node, offset) => {
    window.scrollBy({ top: node.getBoundingClientRect().top - offset, behavior: 'instant' });
  }, top);
}

/** Caixa do elemento na tela; falha se ele não estiver renderizado. */
async function boxOf(element: Locator) {
  const box = await element.boundingBox();
  if (!box) throw new Error('elemento sem caixa na tela');
  return box;
}

/** Espera as transições do elemento terminarem (a caixa medida é a da posição final). */
async function settle(element: Locator): Promise<void> {
  await element.evaluate((node) =>
    Promise.all(node.getAnimations().map((animation) => animation.finished)),
  );
}

/** Opacidade no quadro seguinte ao foco: o bloco tem de aparecer na hora, não ao fim de 1 s. */
async function opacityNow(element: Locator): Promise<string> {
  await nextFrames(element.page(), 1);
  return element.evaluate((node) => getComputedStyle(node).opacity);
}

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('o Tab até um bloco no pé da tela o mostra na hora, acima do botão flutuante', async ({
    page,
  }) => {
    await page.goto('/');
    const cards = areaCards(page);
    // O terceiro cartão inteiro na tela, mas no pé dela, onde fica o botão flutuante: o
    // navegador não rola até um item que já está à vista.
    await cards.nth(2).evaluate((node) => {
      const bottom = window.innerHeight - 20;
      window.scrollBy({ top: node.getBoundingClientRect().bottom - bottom, behavior: 'instant' });
    });
    await cards.nth(1).getByRole('link').focus();
    await page.keyboard.press('Tab');
    const focused = cards.nth(2).getByRole('link');
    await expect(focused).toBeFocused();
    expect(await opacityNow(cards.nth(2))).toBe('1');

    const fab = page.locator('[data-fab]');
    await expect(fab).toHaveClass(/is-visible/);
    await settle(fab);
    const box = await boxOf(focused);
    expect(box.y + box.height).toBeLessThanOrEqual((await boxOf(fab)).y);
  });
});

test.describe('no desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('o Shift+Tab até um cartão acima da tela o mostra na hora, abaixo do header', async ({
    page,
  }) => {
    await page.goto('/');
    const cards = areaCards(page);
    // O quarto cartão logo abaixo do header; o terceiro, acima da tela e ainda escondido.
    await placeAt(cards.nth(3), 100);
    await cards.nth(3).getByRole('link').focus();
    await page.keyboard.press('Shift+Tab');
    const focused = cards.nth(2).getByRole('link');
    await expect(focused).toBeFocused();
    expect(await opacityNow(cards.nth(2))).toBe('1');

    // O header volta ao subir: depois de ele assentar, o cartão focado continua inteiro abaixo dele.
    const header = page.locator('[data-header]');
    await expect(header).not.toHaveClass(/is-tucked/);
    await settle(header);
    const headerBox = await boxOf(header);
    expect((await boxOf(focused)).y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  });
});
