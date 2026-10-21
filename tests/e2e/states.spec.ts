import { test, expect, jumpTo, jumpToSection, type Locator, type Page } from './fixtures';

const ROYAL = 'rgb(0, 22, 123)';
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

type Rgba = [number, number, number, number];

function parseColor(value: string): Rgba {
  const parts = /rgba?\(([^)]+)\)/
    .exec(value)?.[1]
    ?.split(/[\s,/]+/)
    .filter(Boolean);
  if (!parts || parts.length < 3) throw new Error(`cor não reconhecida: ${value}`);
  const [r = 0, g = 0, b = 0, a = 1] = parts.map(Number);
  return [r, g, b, a];
}

/** Cor de cima, com alfa (e a opacidade do elemento), pintada sobre a de baixo. */
function over(top: string, bottom: string, opacity = 1): Rgba {
  const [r1, g1, b1, a1] = parseColor(top);
  const [r2, g2, b2] = parseColor(bottom);
  const a = a1 * opacity;
  return [r1 * a + r2 * (1 - a), g1 * a + g2 * (1 - a), b1 * a + b2 * (1 - a), 1];
}

function luminance([r, g, b]: Rgba): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Razão de contraste WCAG entre duas cores opacas. */
function contrast(a: Rgba, b: Rgba): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const styleOf = (element: Locator, property: string, pseudo?: string) =>
  element.evaluate(
    (node, [name, pseudoElement]) => getComputedStyle(node, pseudoElement).getPropertyValue(name),
    [property, pseudo] as const,
  );

test.describe('alto contraste (forced-colors)', () => {
  // Só o Chromium aplica as cores forçadas no estilo computado; é o motor do Chrome e do Edge,
  // que levam o alto contraste do Windows.
  test.skip(({ browserName }) => browserName !== 'chromium', 'cores forçadas só no Chromium');
  test.use({ viewport: MOBILE });

  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');
  });

  test('o chip escolhido se destaca dos outros', async ({ page }) => {
    await page.getByText('Consumidor', { exact: true }).click();
    const chosen = page.locator('label[for="tema-consumidor"]');
    const other = page.locator('label[for="tema-familia"]');
    await chosen.evaluate((node) =>
      Promise.all(node.getAnimations().map((animation) => animation.finished)),
    );
    // A cor que aparece: o fundo (com o alfa dele) sobre a tela do alto contraste.
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const shown = async (chip: typeof chosen) =>
      over(await styleOf(chip, 'background-color'), canvas).join();
    expect(await shown(chosen)).not.toBe(await shown(other));
  });

  test('chips, botões e o botão flutuante têm contorno', async ({ page }) => {
    for (const element of [
      page.locator('label[for="tema-familia"]'),
      page.locator('[data-wa-cta]'),
      page.locator('[data-fab]'),
    ]) {
      expect(await styleOf(element, 'outline-style')).toBe('solid');
    }
  });

  test('o ± do FAQ e as barras do menu continuam visíveis', async ({ page }) => {
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const bars = [
      [page.locator('.faq-icon').first(), '::before'],
      [page.locator('.faq-icon').first(), '::after'],
      [page.locator('[data-menu-toggle] .menu-icon'), '::before'],
      [page.locator('[data-menu-toggle] .menu-icon'), '::after'],
    ] as const;
    for (const [element, pseudo] of bars) {
      expect(await styleOf(element, 'background-color', pseudo)).not.toBe(canvas);
    }
  });

  test('o indicador do link ativo continua visível', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.evaluate(() => {
      document.getElementById('atuacao')?.scrollIntoView({ behavior: 'instant' });
    });
    const indicator = page.locator('[data-nav-ind]');
    await expect(indicator).toHaveCSS('opacity', '1');
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(await styleOf(indicator, 'background-color')).not.toBe(canvas);
  });
});

test.describe('movimento reduzido', () => {
  test.use({ viewport: MOBILE, reducedMotion: 'reduce' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('barras do menu, ± do FAQ, ✓ do aceite e altura do header mudam sem animar', async ({
    page,
  }) => {
    const instant = [
      [page.locator('[data-menu-toggle] .menu-icon'), '::before'],
      [page.locator('.faq-icon').first(), '::after'],
      [page.locator('[data-contact-form] .check-box svg'), undefined],
      [page.locator('[data-header] .header-inner'), undefined],
      [page.locator('[data-wa-cta]'), '::before'],
      [page.locator('#atuacao li a').first(), '::before'],
    ] as const;
    for (const [element, pseudo] of instant) {
      expect(await styleOf(element, 'transition-duration', pseudo)).toBe('0s');
    }
  });

  test('nada cresce nem desliza no hover e no toque', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const brand = page.locator('[data-header] a').first();
    await brand.hover();
    expect(await styleOf(brand.locator('svg').first(), 'transform')).toBe('none');

    const cta = page.locator('[data-wa-cta]');
    await cta.hover();
    expect(await styleOf(cta.locator('svg'), 'transform')).toBe('none');
    await page.mouse.down();
    expect(await styleOf(cta, 'transform')).toBe('none');
    await page.mouse.up();

    const chip = page.locator('label[for="tema-familia"]');
    await chip.hover();
    await page.mouse.down();
    expect(await styleOf(chip, 'transform')).toBe('none');
    await page.mouse.up();

    const area = page.locator('#atuacao li a').first();
    await area.hover();
    expect(await styleOf(area.locator('svg'), 'transform')).toBe('none');

    const toTop = page.getByRole('link', { name: 'Voltar ao topo' });
    await toTop.hover();
    expect(await styleOf(toTop.locator('svg'), 'transform')).toBe('none');
  });
});

test.describe('toque', () => {
  // isMobile não existe no Firefox.
  test.skip(({ browserName }) => browserName === 'firefox', 'sem emulação de celular no Firefox');
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test('sem hover de verdade, passar por cima não deixa realce grudado', async ({ page }) => {
    await page.goto('/');
    expect(await page.evaluate(() => matchMedia('(hover: hover)').matches)).toBe(false);
    const samples = [
      [page.locator('[data-wa-cta]'), 'transform', '::before'],
      [page.locator('label[for="tema-familia"]'), 'box-shadow', undefined],
      [page.locator('#atuacao li a').first(), 'transform', '::before'],
      [page.getByLabel('Nome', { exact: true }), 'border-top-color', undefined],
      [page.locator('[data-footer] li a').first(), 'opacity', undefined],
    ] as const;
    for (const [element, property, pseudo] of samples) {
      await element.scrollIntoViewIfNeeded();
      const before = await styleOf(element, property, pseudo);
      await element.hover();
      await element.evaluate((node) =>
        Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
      );
      expect(await styleOf(element, property, pseudo), property).toBe(before);
    }
  });
});

test.describe('contraste', () => {
  test.use({ viewport: DESKTOP });

  test('palavras ainda apagadas do manifesto têm contraste de 3:1', async ({ page }) => {
    await page.goto('/');
    const word = page.locator('[data-statement] > *').last();
    await expect(word).not.toHaveClass(/is-lit/);
    const [color, opacity] = await word.evaluate((node) => {
      const style = getComputedStyle(node);
      return [style.color, Number(style.opacity)] as const;
    });
    expect(contrast(over(color, ROYAL, opacity), parseColor(ROYAL))).toBeGreaterThanOrEqual(3);
  });

  test('números das etapas ainda não acesas têm contraste de 3:1', async ({ page }) => {
    await page.goto('/');
    const number = page.locator('[data-step] .step-num').last();
    const color = await styleOf(number, 'color');
    expect(contrast(parseColor(color), parseColor('rgb(255, 255, 255)'))).toBeGreaterThanOrEqual(3);
  });

  test('o contorno dos chips não marcados tem contraste de 3:1', async ({ page }) => {
    await page.goto('/');
    const shadow = await styleOf(page.locator('label[for="tema-familia"]'), 'box-shadow');
    const ring = /rgba?\([^)]+\)/.exec(shadow)?.[0] ?? '';
    expect(contrast(over(ring, ROYAL), parseColor(ROYAL))).toBeGreaterThanOrEqual(3);
  });
});

test.describe('texto que não cabe', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  /** Espaçamento de texto do WCAG 1.4.12, como o aplicaria uma extensão do navegador. */
  const TEXT_SPACING = `
    * { line-height: 1.5 !important; letter-spacing: 0.12em !important;
        word-spacing: 0.16em !important; }
    p { margin-bottom: 2em !important; }
  `;

  test('um e-mail longo quebra em vez de sair da tela', async ({ page }) => {
    await page.goto('/');
    // Os links de e-mail, achados pelo mailto: (e não pelo texto, que muda quando o e-mail real
    // entrar), ganham um endereço longo.
    const links = page.locator('a[href^="mailto:"]');
    expect(await links.count()).toBeGreaterThan(0);
    await links.evaluateAll((elements) => {
      for (const element of elements) {
        element.textContent = 'atendimento.juridico@diogomenaniadvocacia.adv.br';
      }
    });
    const overflowing = await links.evaluateAll(
      (elements) =>
        elements.filter((link) => link.getBoundingClientRect().right > window.innerWidth).length,
    );
    expect(overflowing).toBe(0);
  });

  test('com o espaçamento de texto ampliado, botões quebram linha e o header cresce', async ({
    page,
  }) => {
    await page.goto('/');
    await page.addStyleTag({ content: TEXT_SPACING });
    const clipped = await page.locator('.btn').evaluateAll((buttons) =>
      buttons
        .filter((button) => button.getClientRects().length > 0)
        .filter((button) => button.scrollWidth > button.clientWidth + 1)
        .map((button) => button.textContent.trim()),
    );
    expect(clipped).toEqual([]);
    const header = page.locator('[data-header] .header-inner');
    const [scrollHeight, clientHeight] = await header.evaluate((node) => [
      node.scrollHeight,
      node.clientHeight,
    ]);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1);
  });
});

test.describe('impressão', () => {
  test.use({ viewport: DESKTOP });

  test('seções royal e rodapé saem com as cores, e as etapas acesas', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
    // Trocar de mídia dispara as transições de cor; o papel só vê o estado final.
    await page.evaluate(() =>
      Promise.all(document.getAnimations().map((animation) => animation.finished)),
    );
    for (const element of [page.locator('#contato'), page.locator('[data-footer]')]) {
      const exact = await element.evaluate((node) => {
        const style = getComputedStyle(node);
        return [
          style.getPropertyValue('print-color-adjust'),
          style.getPropertyValue('-webkit-print-color-adjust'),
        ];
      });
      expect(exact).toContain('exact');
    }
    const steps = await page
      .locator('[data-step] .step-num')
      .evaluateAll((numbers) => numbers.map((number) => getComputedStyle(number).color));
    expect(steps).toEqual(steps.map(() => ROYAL));
    const dim = await page
      .locator('[data-statement] > *')
      .evaluateAll(
        (words) => words.filter((word) => getComputedStyle(word).opacity !== '1').length,
      );
    expect(dim).toBe(0);
  });
});

test.describe('sem JavaScript', () => {
  test.use({ viewport: MOBILE, javaScriptEnabled: false });

  test('o header rola com a página e o que depende de script não aparece', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-header]')).not.toHaveCSS('position', 'fixed');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    await expect(page.locator('[data-contact-form]')).toBeHidden();
    // O contato continua pelos botões e links do WhatsApp.
    await expect(page.getByRole('link', { name: 'Conversar pelo WhatsApp' })).toBeAttached();
  });
});

test.describe('botão flutuante', () => {
  test.use({ viewport: MOBILE });

  test('fica dentro do rodapé (landmark), no mesmo lugar da tela', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('contentinfo').locator('[data-fab]')).toHaveCount(1);
    await jumpTo(page, 1500);
    const fab = page.locator('[data-fab]');
    await expect(fab).toHaveClass(/is-visible/);
    await fab.evaluate((node) =>
      Promise.all(node.getAnimations().map((animation) => animation.finished)),
    );
    // A 16 px da direita e de baixo, como antes de mudar de lugar no HTML.
    const gaps = await fab.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return [
        Math.round(window.innerWidth - rect.right),
        Math.round(window.innerHeight - rect.bottom),
      ];
    });
    expect(gaps).toEqual([16, 16]);
  });

  test('o anel de foco aparece também sobre o fundo royal', async ({ page }) => {
    await page.goto('/');
    await jumpTo(page, 1500);
    const fab = page.locator('[data-fab]');
    await expect(fab).toHaveClass(/is-visible/);
    await fab.focus();
    // Um anel branco entre o botão (royal) e o contorno: visível em fundo claro e em royal.
    expect(await styleOf(fab, 'box-shadow')).toContain('rgb(255, 255, 255) 0px 0px 0px 2px');
    expect(await styleOf(fab, 'outline-offset')).toBe('2px');
  });
});

test('as listas de conteúdo mantêm a semântica de lista no Safari', async ({ page }) => {
  // O VoiceOver ignora listas com list-style: none, a não ser com role="list".
  await page.goto('/');
  const lists = page.locator('#atuacao ul, #contato ul, [data-footer] ul');
  await expect(lists).toHaveCount(5);
  for (const list of await lists.all()) await expect(list).toHaveAttribute('role', 'list');
});

/**
 * Rola em `samples` paradas, levando o topo de `anchor` de `from` a `to` (frações da altura da
 * tela), e anota em cada parada quais `items` estão acesos (com a classe `lit`).
 */
function litWhileScrolling(
  page: Page,
  options: { anchor: string; items: string; lit: string; from: number; to: number },
  samples = 16,
): Promise<boolean[][]> {
  return page.evaluate(
    async ({ anchor, items, lit, from, to, stops }) => {
      const target = document.querySelector(anchor);
      if (!target) throw new Error(`${anchor} não existe`);
      const elements = [...document.querySelectorAll(items)];
      const seen: boolean[][] = [];
      for (let i = 0; i < stops; i++) {
        const top = window.innerHeight * (from + ((to - from) * i) / (stops - 1));
        window.scrollBy({ top: target.getBoundingClientRect().top - top, behavior: 'instant' });
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        seen.push(elements.map((element) => element.classList.contains(lit)));
      }
      return seen;
    },
    { ...options, stops: samples },
  );
}

test.describe('rolagem', () => {
  test.use({ viewport: DESKTOP });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('a barra de progresso vai de 0 no topo a 1 no fim da página', async ({ page }) => {
    // mata: y / maxScroll virando y / scrollHeight em scroll-effects (sem descontar a tela)
    const scale = () =>
      page
        .locator('[data-progress]')
        .evaluate((bar) => new DOMMatrix(getComputedStyle(bar).transform).a);
    await expect.poll(scale).toBeCloseTo(0, 2);
    await jumpTo(page, await page.evaluate(() => document.documentElement.scrollHeight));
    await expect.poll(scale).toBeCloseTo(1, 2);
  });

  test('o indicador da navegação fica sob o link da seção visível', async ({ page }) => {
    // mata: translateX(linkRect.left − navRect.left) virando translateX(linkRect.left)
    const indicator = page.locator('[data-nav-ind]');
    for (const [id, name] of [
      ['atuacao', 'Atuação'],
      ['duvidas', 'Dúvidas'],
    ] as const) {
      await jumpToSection(page, id);
      const link = page.locator('[data-nav]').getByRole('link', { name, exact: true });
      await expect(link).toHaveAttribute('aria-current', 'true');
      // O indicador desliza até o link: vale a posição em que ele para.
      await expect
        .poll(async () => {
          const [bar, under] = await Promise.all([indicator.boundingBox(), link.boundingBox()]);
          if (!bar || !under) return Infinity;
          return Math.max(Math.abs(bar.x - under.x), Math.abs(bar.width - under.width));
        })
        .toBeLessThan(1);
    }
  });

  const lighting = [
    {
      title: 'as etapas acendem em ordem ao rolar',
      // mata: index < active virando steps.length − 1 − index < active (de trás para a frente)
      scroll: { anchor: '[data-step]', items: '[data-step]', lit: 'is-active', from: 1, to: 0.3 },
    },
    {
      title: 'as palavras do manifesto acendem ao rolar',
      // mata: index < lit virando index <= lit (a primeira palavra acende antes da hora)
      scroll: {
        anchor: '[data-statement]',
        items: '[data-statement] > *',
        lit: 'is-lit',
        from: 1,
        to: -0.5,
      },
    },
  ];
  for (const { title, scroll } of lighting) {
    test(title, async ({ page }) => {
      const seen = await litWhileScrolling(page, scroll);
      const counts = seen.map((lit) => lit.filter(Boolean).length);
      // Cada parada acende um começo da lista, que só cresce, de nenhum a todos, passando por
      // estados intermediários.
      expect(seen).toEqual(counts.map((count, stop) => seen[stop]?.map((_, i) => i < count)));
      expect(counts).toEqual(counts.toSorted((a, b) => a - b));
      expect(counts[0]).toBe(0);
      expect(counts.at(-1)).toBe(seen[0]?.length);
      expect(new Set(counts).size).toBeGreaterThan(2);
    });
  }

  test('o botão flutuante some perto do rodapé', async ({ page }) => {
    // mata: !(nearContact || nearFooter) virando !nearContact em isFabVisible
    await page.setViewportSize(MOBILE);
    const fab = page.locator('[data-fab]');
    await jumpTo(page, 1500);
    await expect(fab).toHaveClass(/is-visible/);
    // No fim da página o contato já saiu por cima da tela e só o rodapé aparece.
    await jumpTo(page, await page.evaluate(() => document.documentElement.scrollHeight));
    await expect
      .poll(() =>
        page.evaluate(() => document.getElementById('contato')?.getBoundingClientRect().bottom),
      )
      .toBeLessThan(0);
    await expect(fab).not.toHaveClass(/is-visible/);
  });
});

test('depois de trocar o tema, o botão principal volta à opacidade 1', async ({ page }) => {
  // mata: leave.cancel() removido em topic-picker (a saída, com fill forwards, prende o rótulo em 0)
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await page.getByText('Consumidor', { exact: true }).click();
  const cta = page.locator('[data-wa-cta]');
  // O rótulo novo entra quando a saída do antigo termina; a entrada começa no mesmo instante.
  await expect(cta.locator('[data-wa-label]')).toHaveText('Conversar sobre consumo');
  await cta.evaluate((node) =>
    Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
  for (const element of [cta, cta.locator('[data-wa-label]')]) {
    await expect(element).toHaveCSS('opacity', '1');
  }
});
