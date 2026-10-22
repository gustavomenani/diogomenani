import { test, expect, jumpTo, jumpToSection, type Locator, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const header = (page: Page) => page.locator('[data-header]');
const navLink = (page: Page, name: string) =>
  page.locator('[data-nav]').getByRole('link', { name, exact: true });

/**
 * Rola até o topo da seção ficar a `top` px do topo da tela, sem animação, depois de um quadro (o
 * do load: antes dele, a rolagem contaria como a volta do recarregar; ver jumpTo em fixtures.ts).
 */
async function placeSection(page: Page, id: string, top: number): Promise<void> {
  await page.evaluate(
    async ([sectionId, offset]) => {
      await new Promise(requestAnimationFrame);
      const section = document.getElementById(sectionId);
      if (!section) throw new Error(`seção #${sectionId} não existe`);
      window.scrollBy({ top: section.getBoundingClientRect().top - offset, behavior: 'instant' });
    },
    [id, top] as const,
  );
}

/** Meio vertical do elemento na tela. */
const middleOf = (locator: Locator) =>
  locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return rect.top + rect.height / 2;
  });

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

// Com movimento reduzido, o preenchimento aparece sem deslizar: só a cor transiciona.
for (const [reducedMotion, fillTransitions] of [
  ['no-preference', 'transform, background-color'],
  ['reduce', 'background-color'],
] as const) {
  test(`com o mouse na chamada, o preenchimento troca de cor junto com o rótulo quando o header muda (${reducedMotion})`, async ({
    page,
  }) => {
    // mata: a transição de background-color do preenchimento da chamada (Header.astro). Trocado de
    // estalo, ele virava royal-bright enquanto o rótulo ainda esmaecia do royal (1,3:1), e branco
    // sob o rótulo ainda branco na volta ao topo
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    const button = header(page).locator('.btn-header');
    await button.hover();
    // O preenchimento termina de entrar antes da rolagem.
    await button.evaluate((node) =>
      Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    );
    // No primeiro quadro com o header no estado rolado: a duração das transições de cor que
    // começaram no preenchimento (::before) e no rótulo.
    const durations = await button.evaluate(async (node) => {
      const site = node.closest('[data-header]');
      if (!site) throw new Error('a chamada está fora do header');
      await new Promise(requestAnimationFrame);
      window.scrollTo({ top: 120, behavior: 'instant' });
      for (let i = 0; i < 60 && !site.classList.contains('is-scrolled'); i++) {
        await new Promise(requestAnimationFrame);
      }
      if (!site.classList.contains('is-scrolled')) throw new Error('o header não mudou de estado');
      const duration = (property: string, pseudo: string | null) =>
        node
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation instanceof CSSTransition &&
              animation.transitionProperty === property &&
              animation.effect instanceof KeyframeEffect &&
              animation.effect.target === node &&
              animation.effect.pseudoElement === pseudo,
          )
          .map((animation) => Number(animation.effect?.getTiming().duration));
      return { fill: duration('background-color', '::before'), label: duration('color', null) };
    });
    expect(durations.label).toEqual([400]);
    expect(durations.fill).toEqual(durations.label);
    expect(
      await button.evaluate((node) => getComputedStyle(node, '::before').transitionProperty),
    ).toBe(fillTransitions);
  });
}

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

test('a âncora da navegação pousa com o header à mostra; a rolagem do visitante volta a recolhê-lo', async ({
  page,
}) => {
  // mata: a trava do header nas rolagens de link interno (scroll-effects.ts). A descida até a
  // âncora recolhia o header no caminho, e a seção pousava abaixo de uma faixa de 84 px da anterior
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/');
  await navLink(page, 'Contato').click();
  await expect(page).toHaveURL(/#contato$/);
  // A rolagem suave assenta logo abaixo do header (scroll-padding-top, 84 px), igual em duas
  // leituras seguidas.
  let previousTop = Number.NaN;
  await expect
    .poll(async () => {
      const top = await page.evaluate(
        () => document.getElementById('contato')?.getBoundingClientRect().top ?? Number.NaN,
      );
      const settled = Math.abs(top - 84) <= 2 && Math.abs(top - previousTop) < 0.5;
      previousTop = top;
      return settled;
    })
    .toBe(true);
  await expect(header(page)).not.toHaveClass(/is-tucked/);
  await expect(navLink(page, 'Contato')).toHaveAttribute('aria-current', 'true');

  await page.mouse.move(683, 500);
  await page.mouse.wheel(0, 240);
  await expect(header(page)).toHaveClass(/is-tucked/);
});

test('o indicador que reaparece surge já sob o link novo, sem atravessar a navegação', async ({
  page,
}) => {
  // mata: o indicador escondido que reaparecia deslizando (scroll-effects.ts). De volta ao topo,
  // ele guardava a posição do Contato e, ao ir para o Sobre, cruzava a navegação enquanto acendia
  await page.goto('/');
  const indicator = page.locator('[data-nav-ind]');
  await jumpToSection(page, 'contato');
  await expect(navLink(page, 'Contato')).toHaveAttribute('aria-current', 'true');
  await jumpTo(page, 0);
  await expect(navLink(page, 'Contato')).not.toHaveAttribute('aria-current');
  await expect.poll(() => indicator.evaluate((node) => node.getAnimations().length)).toBe(0);
  // No primeiro quadro em que ele acende, a distância até a posição do link Sobre.
  const offset = await page.evaluate(async () => {
    const bar = document.querySelector('[data-nav-ind]');
    const nav = document.querySelector('[data-nav]');
    const link = nav?.querySelector('a[href="#sobre"]');
    if (!bar || !nav || !link) throw new Error('navegação sem o indicador ou o link Sobre');
    document.getElementById('sobre')?.scrollIntoView({ behavior: 'instant' });
    for (let i = 0; i < 60; i++) {
      await new Promise(requestAnimationFrame);
      const style = getComputedStyle(bar);
      if (Number(style.opacity) > 0) {
        const left = link.getBoundingClientRect().left - nav.getBoundingClientRect().left;
        return new DOMMatrix(style.transform).e - left;
      }
    }
    throw new Error('o indicador não acendeu');
  });
  expect(Math.abs(offset)).toBeLessThan(1);
});

test('marca o link da seção visível', async ({ page }) => {
  await page.goto('/');
  await jumpToSection(page, 'duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  for (const name of ['Sobre', 'Atuação', 'Como trabalhamos', 'Contato']) {
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

  test('o logo branco aparece no topo e com o menu aberto depois de rolar, e o azul no header rolado', async ({
    page,
  }) => {
    // mata: as regras de opacidade do logo apagadas ou invertidas (o branco sobre o header claro
    // rolado, ou o azul sobre o royal do menu aberto depois de rolar: nos dois casos o logo some),
    // e a troca de tone entre as duas versões do Header.astro (tone="blue" no .on-dark). Por isso
    // os logos são achados pelo arquivo, e não pela classe: pela classe, a opacidade continuava
    // certa e o logo sumia nos três estados. Só a regressão visual via isso, e ela fica fora do CI.
    // O botão Menu só existe no celular.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const white = header(page).locator('img[src="/logo-compact-white.svg"]');
    const blue = header(page).locator('img[src="/logo-compact-blue.svg"]');
    // O texto alternativo fica com a branca, a que aparece no topo; a azul, por cima, é decorativa.
    await expect(white).toHaveAttribute('alt', 'Diogo Menani — Advocacia e Assessoria Jurídica');
    await expect(blue).toHaveAttribute('alt', '');
    await expect(white).toHaveCSS('opacity', '1');
    await expect(blue).toHaveCSS('opacity', '0');
    await jumpTo(page, 200);
    await expect(header(page)).toHaveClass(/is-scrolled/);
    await expect(white).toHaveCSS('opacity', '0');
    await expect(blue).toHaveCSS('opacity', '1');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(header(page)).toHaveClass(/is-scrolled/);
    await expect(white).toHaveCSS('opacity', '1');
    await expect(blue).toHaveCSS('opacity', '0');
  });
});

test('abrir em /#duvidas já marca Dúvidas e revela a seção', async ({ page }) => {
  await page.goto('/#duvidas');
  await expect(navLink(page, 'Dúvidas')).toHaveAttribute('aria-current', 'true');
  await expect(page.locator('#duvidas [data-reveal]').first()).toHaveClass(/is-in/);
});

for (const width of [1200, 1240, 1279]) {
  test(`a ${width} px, o botão do header fica com a largura do rótulo`, async ({ page }) => {
    // mata: a faixa compacta terminando em 1199 px (o header completo não cabia, e o botão, com
    // overflow: hidden, encolhia e comia o respiro da pílula)
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const button = header(page).locator('.btn-header');
    const [scrollWidth, clientWidth] = await button.evaluate((node) => [
      node.scrollWidth,
      node.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    // Na mesma linha do logo: o header não quebrou.
    const [brand, cta] = await Promise.all([
      middleOf(header(page).locator('.brand')),
      middleOf(button),
    ]);
    expect(Math.abs(brand - cta)).toBeLessThan(2);
  });
}

test('no celular, abrir o menu não encolhe o logo', async ({ page }) => {
  // mata: o rótulo do botão sem a largura reservada de "Fechar" (o botão crescia ao abrir, e o
  // logo, o item flexível até 479 px, encolhia 9 px)
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto('/');
  const logoWidth = () =>
    header(page)
      .locator('.brand-logo.on-dark')
      .evaluate((logo) => logo.getBoundingClientRect().width);
  const closed = await logoWidth();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeVisible();
  expect(await logoWidth()).toBeCloseTo(closed, 1);
});

test('no celular, o link da marca tem a largura do logo, e o Menu fica na borda direita', async ({
  page,
}) => {
  // mata: a marca flexível até o Menu (flex: 1 1 auto) no celular: de 391 a 479 px, o link ficava
  // até 86 px mais largo que o logo, o vão vazio levava ao início e o anel do foco o contornava
  for (const width of [320, 360, 414, 430, 479]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const layout = await header(page).evaluate((node) => {
      const box = (selector: string) => node.querySelector(selector)?.getBoundingClientRect();
      const inner = node.querySelector('.header-inner');
      const padding = inner ? Number.parseFloat(getComputedStyle(inner).paddingRight) : NaN;
      return {
        link: box('.brand')?.width ?? NaN,
        logo: box('.brand-logo.on-dark')?.width ?? NaN,
        toggleRight: box('[data-menu-toggle]')?.right ?? NaN,
        innerRight: (inner?.getBoundingClientRect().right ?? NaN) - padding,
      };
    });
    expect(Math.abs(layout.link - layout.logo), `${width} px`).toBeLessThanOrEqual(0.5);
    expect(layout.logo, `${width} px`).toBeLessThanOrEqual(240.5);
    expect(Math.abs(layout.toggleRight - layout.innerRight), `${width} px`).toBeLessThanOrEqual(
      0.5,
    );
  }
});
