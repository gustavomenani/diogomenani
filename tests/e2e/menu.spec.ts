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
  await menuLink(page, 'Fale conosco pelo WhatsApp (abre em outra aba)').focus();
  await page.keyboard.press('Tab');
  await expect(toggle(page)).toBeFocused();
});

test('clicar num link fecha o menu e navega', async ({ page }) => {
  await openMenu(page);
  await menuLink(page, 'Dúvidas').click();
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(page).toHaveURL(/#duvidas$/);
});

test('com mouse, o link sob o ponteiro ganha o sublinhado', async ({ page }) => {
  // mata: o :hover dos links do menu (MobileMenu.astro). O menu vale até 1079 px, também em
  // notebook estreito e tablet com mouse, e era o único grupo de links sem retorno ao ponteiro
  await openMenu(page);
  const link = menuLink(page, 'Dúvidas');
  await expect(link).toHaveCSS('text-decoration-line', 'none');
  await link.hover();
  await expect(link).toHaveCSS('text-decoration-line', 'underline');
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

test('virar desktop leva o foco ao link equivalente do header', async ({ page }) => {
  await openMenu(page);
  await menuLink(page, 'Dúvidas').focus();
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  await expect(
    page.locator('[data-nav]').getByRole('link', { name: 'Dúvidas', exact: true }),
  ).toBeFocused();
});

test('Esc logo depois de abrir fecha o menu', async ({ page }) => {
  // No Safari, o clique não foca o botão: o Esc chega com o foco ainda no corpo da página.
  await toggle(page).click();
  await page.keyboard.press('Escape');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

test('Esc fecha com o foco no fundo do menu', async ({ page }) => {
  await openMenu(page);
  // Um clique no fundo vazio do menu tira o foco dos links.
  await page.locator('[data-menu]').click({ position: { x: 300, y: 560 } });
  await expect(menuLink(page, 'Sobre')).not.toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
});

test('voltar no histórico com o menu aberto o fecha', async ({ page }) => {
  await openMenu(page);
  await menuLink(page, 'Dúvidas').click();
  await expect(page).toHaveURL(/#duvidas$/);
  // A descida até a âncora não recolhe o header (scroll-effects.ts), e o botão do menu continua à
  // mostra depois que a rolagem assenta logo abaixo dele (84 px), igual em duas leituras seguidas.
  let previousTop = Number.NaN;
  await expect
    .poll(async () => {
      const top = await page.evaluate(
        () => document.getElementById('duvidas')?.getBoundingClientRect().top ?? Number.NaN,
      );
      const settled = Math.abs(top - 84) <= 2 && Math.abs(top - previousTop) < 0.5;
      previousTop = top;
      return settled;
    })
    .toBe(true);
  await expect(page.locator('[data-header]')).not.toHaveClass(/is-tucked/);
  await openMenu(page);
  await page.goBack();
  await expect(page).not.toHaveURL(/#duvidas$/);
  await expect(toggle(page)).toHaveAttribute('aria-expanded', 'false');
  // O foco estava num link do menu, que ficou inerte: volta ao botão.
  await expect(toggle(page)).toBeFocused();
  await expect.poll(() => rootOverflow(page)).toBe('');
});

test('aberto, o header fica royal opaco: o menu rolado passa por baixo da marca', async ({
  page,
}) => {
  await openMenu(page);
  await expect(page.locator('[data-header]')).toHaveCSS('background-color', 'rgb(0, 22, 123)');
});

test('com barras de rolagem clássicas, abrir o menu não move o botão', async ({
  playwright,
  baseURL,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'abre um Chromium próprio, sem o --hide-scrollbars');
  const browser = await playwright.chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(baseURL ?? '/');
    const scrollbar = () =>
      page.evaluate(() => window.innerWidth - document.documentElement.clientWidth);
    const right = () => toggle(page).evaluate((button) => button.getBoundingClientRect().right);
    expect(await scrollbar()).toBeGreaterThan(0);
    const before = await right();
    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
    expect(await right()).toBe(before);
    // A faixa reservada para a barra acompanha o menu, em vez de ficar branca.
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 22, 123)');
  } finally {
    await browser.close();
  }
});

test.describe('tela baixa', () => {
  test.use({ viewport: { width: 844, height: 390 } });

  test('em tela baixa o menu usa a versão compacta', async ({ page }) => {
    await page.goto('/');
    await openMenu(page);
    const first = menuLink(page, 'Sobre');
    await expect(first).toHaveCSS('font-size', '30px');
    await expect(first).toHaveCSS('padding-top', '4px');
    await expect(page.locator('[data-menu] .menu-foot')).toHaveCSS('padding-top', '20px');
  });

  test('o menu rolável focado pelo teclado tem contorno visível', async ({ page, browserName }) => {
    test.skip(browserName !== 'firefox', 'só o Firefox foca a área rolável que tem links dentro');
    await page.goto('/');
    await openMenu(page);
    await toggle(page).focus();
    await page.keyboard.press('Tab');
    const menu = page.locator('[data-menu]');
    await expect(menu).toBeFocused();
    // Branco, por dentro: o menu ocupa a tela toda, e um contorno por fora ficaria fora dela.
    await expect(menu).toHaveCSS('outline-color', 'rgb(255, 255, 255)');
    expect(
      parseFloat(await menu.evaluate((node) => getComputedStyle(node).outlineOffset)),
    ).toBeLessThan(0);
  });

  test('com barras de rolagem clássicas, a barra do menu é fina', async ({
    playwright,
    baseURL,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'abre um Chromium próprio, sem o --hide-scrollbars');
    const browser = await playwright.chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
    try {
      const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
      await page.goto(baseURL ?? '/');
      // A barra da página já é fina (base.css): a do menu, que rola em tela baixa, também.
      const pageBar = await page.evaluate(
        () => window.innerWidth - document.documentElement.clientWidth,
      );
      await toggle(page).click();
      await expect(toggle(page)).toHaveAttribute('aria-expanded', 'true');
      const menuBar = await page
        .locator('[data-menu]')
        .evaluate((menu: HTMLElement) => menu.offsetWidth - menu.clientWidth);
      expect(menuBar).toBeGreaterThan(0);
      expect(menuBar).toBeLessThanOrEqual(pageBar);
    } finally {
      await browser.close();
    }
  });
});

test.describe('tela muito baixa (zoom alto, celular deitado)', () => {
  for (const viewport of [
    { width: 320, height: 180 },
    { width: 568, height: 320 },
  ]) {
    test(`a ${viewport.width}×${viewport.height}, o link focado pelo teclado não some sob o header`, async ({
      page,
      browserName,
    }) => {
      test.skip(
        browserName === 'webkit',
        'no Safari o Tab não passa por links (padrão da plataforma)',
      );
      // mata: o scroll-padding-top do menu (ele rola por baixo do header fixo, opaco quando aberto)
      await page.setViewportSize(viewport);
      await openMenu(page);
      await menuLink(page, 'Fale conosco pelo WhatsApp (abre em outra aba)').focus();
      const headerBottom = await page
        .locator('[data-header]')
        .evaluate((header) => header.getBoundingClientRect().bottom);
      // Pelo menos metade de cada link fica abaixo do header (WCAG 2.4.11). O Chromium para a
      // rolagem logo abaixo dele; o Firefox não rola um link que já cabe na área rolável, mesmo
      // em parte sob a folga, mas nenhum some inteiro (sem a folga, alguns sumiam inteiros).
      for (const name of ['Contato', 'Dúvidas', 'Como trabalhamos', 'Atuação', 'Sobre']) {
        await page.keyboard.press('Shift+Tab');
        const link = menuLink(page, name);
        await expect(link).toBeFocused();
        const { bottom, height } = await link.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { bottom: rect.bottom, height: rect.height };
        });
        expect(bottom - headerBottom, name).toBeGreaterThanOrEqual(height / 2);
      }
    });
  }
});
