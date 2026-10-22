import {
  test,
  expect,
  nextFrames,
  SUBMIT,
  TEXT_SPACING,
  type Locator,
  type Page,
} from './fixtures';

// No Safari o Tab não passa por links (padrão da plataforma): o teclado aqui é o do Chromium e o
// do Firefox, que rola menos ao focar.
test.skip(({ browserName }) => browserName === 'webkit', 'no Safari o Tab não passa por links');

/** Cartões das áreas de atuação, empilhados em coluna em qualquer largura. */
const areaCards = (page: Page) => page.locator('#atuacao li');

/**
 * Rola até o topo do elemento ficar a `top` px do topo da tela, sem animação, depois de um quadro
 * (o do load: antes dele, a rolagem não recolheria o header; ver jumpTo em fixtures.ts).
 */
async function placeAt(element: Locator, top: number): Promise<void> {
  await element.evaluate(async (node, offset) => {
    await new Promise(requestAnimationFrame);
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

/** Aperta `key` até o foco chegar a `target`, no máximo `limit` vezes. */
async function pressUntilFocused(target: Locator, key: string, limit: number): Promise<void> {
  for (let i = 0; i < limit; i++) {
    await target.page().keyboard.press(key);
    if (await target.evaluate((node) => node === document.activeElement)) return;
  }
  throw new Error(`${key} não chegou ao elemento em ${limit} vezes`);
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
    // navegador não rola até um item que já está à vista. A rolagem espera o quadro do load (ver
    // jumpTo em fixtures.ts): antes dele, ela contaria como a volta do recarregar, e o cartão
    // apareceria na hora, antes do Tab.
    await cards.nth(2).evaluate(async (node) => {
      await new Promise(requestAnimationFrame);
      const bottom = window.innerHeight - 20;
      window.scrollBy({ top: node.getBoundingClientRect().bottom - bottom, behavior: 'instant' });
    });
    // O cartão ainda está entrando: sem isto, o teste passaria sem o revealAround.
    expect(
      await cards
        .nth(2)
        .evaluate(
          (node) => node.getAnimations().length > 0 || getComputedStyle(node).opacity !== '1',
        ),
    ).toBe(true);
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
    const header = page.locator('[data-header]');
    // O quarto cartão logo abaixo do header; o terceiro, acima da tela e ainda escondido.
    await placeAt(cards.nth(3), 100);
    // O header recolhe antes do Shift+Tab: a subida do foco e a descida do placeAt no mesmo
    // quadro deixariam o header sem saber para que lado a página rolou.
    await expect(header).toHaveClass(/is-tucked/);
    await cards.nth(3).getByRole('link').focus();
    await page.keyboard.press('Shift+Tab');
    const focused = cards.nth(2).getByRole('link');
    await expect(focused).toBeFocused();
    expect(await opacityNow(cards.nth(2))).toBe('1');

    // O header volta ao subir: depois de ele assentar, o cartão focado continua inteiro abaixo dele.
    await expect(header).not.toHaveClass(/is-tucked/);
    await settle(header);
    const headerBox = await boxOf(header);
    expect((await boxOf(focused)).y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  });

  test('o anel do foco num cartão das áreas fica em volta do fundo arredondado, não do link', async ({
    page,
  }) => {
    // mata: o contorno geral do foco na caixa do link (os lados corriam por dentro do fundo royal
    // e o alto e o pé saíam para fora: dois quadros desencontrados)
    await page.goto('/');
    await page.locator('.areas-note a').focus();
    await page.keyboard.press('Tab');
    const card = areaCards(page).first().getByRole('link');
    await expect(card).toBeFocused();
    await expect(card).toHaveCSS('outline-style', 'none');
    const ring = await card.evaluate((node) => {
      const style = getComputedStyle(node, '::before');
      return [style.outlineStyle, style.outlineWidth, style.outlineColor, style.outlineOffset];
    });
    expect(ring).toEqual(['solid', '2px', 'rgb(36, 64, 230)', '3px']);
  });
});

test.describe('num desktop de 1280 × 720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('o Tab até uma pergunta abaixo da tela deixa o pé do anel de foco à vista', async ({
    page,
  }) => {
    // mata: a folga de baixo das rolagens só abaixo de 1080 px (base.css): no desktop, o Tab
    // parava a pergunta rente à borda, e o pé do anel (2 px + 3 px de afastamento) ficava cortado
    await page.goto('/');
    const question = page.getByRole('button', {
      name: 'Quais documentos devo separar?',
      exact: true,
    });
    await pressUntilFocused(question, 'Tab', 60);
    // Com a rolagem suave, a pergunta sobe até parar: o pé do anel tem de caber na tela.
    await expect
      .poll(() =>
        question.evaluate((node) => node.getBoundingClientRect().bottom + 5 - window.innerHeight),
      )
      .toBeLessThanOrEqual(0);
  });
});

test.describe('com o espaçamento de texto ampliado (WCAG 1.4.12), no desktop compacto', () => {
  test.use({ viewport: { width: 1100, height: 800 } });

  test('o Shift+Tab até o aceite do formulário o deixa abaixo do header, que quebrou de linha', async ({
    page,
  }) => {
    // mata: a folga das rolagens presa nos 84 px do token (--header-live, em scroll-effects.ts):
    // com o espaçamento, o header quebra em duas linhas e o aceite parava inteiro embaixo dele
    await page.goto('/');
    await page.addStyleTag({ content: TEXT_SPACING });
    const header = page.locator('[data-header]');
    expect(await header.evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThan(
      100,
    );
    const consent = page.locator('#f-lgpd');
    const submit = page.getByRole('button', { name: SUBMIT, exact: true });
    // O botão de enviar no alto da tela, e o aceite acima dela; o header recolhe na descida. O
    // foco vai para o botão sem a rolagem do focus(), que no Chromium o levaria ao meio da tela
    // (com o aceite à vista, o Shift+Tab não rolaria). O Firefox centraliza também no Shift+Tab.
    await placeAt(submit, 10);
    await expect(header).toHaveClass(/is-tucked/);
    await submit.evaluate((node) => {
      node.focus({ preventScroll: true });
    });
    // Do botão, o link do aviso de privacidade e depois o aceite.
    await pressUntilFocused(consent, 'Shift+Tab', 4);

    await expect(header).not.toHaveClass(/is-tucked/);
    await settle(header);
    const headerBox = await boxOf(header);
    const box = await boxOf(page.locator('#f-lgpd + .check-box'));
    expect(box.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);
  });
});

test.describe('numa janela de desktop baixa', () => {
  test.use({ viewport: { width: 1280, height: 400 } });

  test('o Tab até o link de "Onde podemos ajudar" o traz para a tela', async ({ page }) => {
    // mata: o bloco do título grudado (sticky) em qualquer altura de janela: preso a 120 px do
    // topo, o link "Envie uma mensagem" ficava abaixo da borda, e a rolagem não o alcançava
    await page.goto('/');
    const link = page.locator('.areas-note a');
    await pressUntilFocused(link, 'Tab', 30);
    await expect
      .poll(() =>
        link.evaluate((node) => {
          const rect = node.getBoundingClientRect();
          return rect.top >= 0 && rect.bottom <= window.innerHeight;
        }),
      )
      .toBe(true);
  });
});
