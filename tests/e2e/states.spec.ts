import {
  test,
  expect,
  jumpTo,
  jumpToSection,
  OAB,
  pageReady,
  TEXT_SPACING,
  type Locator,
  type Page,
} from './fixtures';

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
    await page.locator('label[for="tema-consumidor"]').click();
    const chosen = page.locator('label[for="tema-consumidor"]');
    const other = page.locator('label[for="tema-familia-internacional"]');
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
      page.locator('label[for="tema-familia-internacional"]'),
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

  for (const [colorScheme, theme, filter] of [
    ['light', 'claro', 'brightness(0)'],
    ['dark', 'escuro', 'brightness(0) invert(1)'],
  ] as const) {
    test(`os logos em arquivo ficam com a cor do texto do sistema (tema ${theme})`, async ({
      page,
    }) => {
      // mata: os logos em <img> sem filtro no alto contraste (o modo não recolore imagens: o
      // branco sumia no tema claro, e o texto preto do azul, no escuro)
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      for (const selector of [
        '[data-header] .brand-logo.on-dark',
        '[data-header] .brand-logo.on-light',
        '.about-logo',
        '.footer-name',
        '.footer-sub',
      ]) {
        expect(await styleOf(page.locator(selector), 'filter'), selector).toBe(filter);
      }
      await page.goto('/privacidade/');
      expect(await styleOf(page.getByRole('banner').locator('img'), 'filter')).toBe(filter);
    });

    test(`o chip escolhido e focado pelo teclado tem anel de foco (tema ${theme})`, async ({
      page,
    }) => {
      // mata: o contorno #fff do chip escolhido, que o forced-color-adjust: none deixava fora do
      // modo e sumia no tema claro (o Tab cai justo no rádio marcado)
      await page.emulateMedia({ forcedColors: 'active', colorScheme });
      await page.locator('.chip-input').first().focus();
      await page.keyboard.press('ArrowRight');
      const radio = page.locator('#tema-familia-internacional');
      await expect(radio).toBeChecked();
      await expect(radio).toBeFocused();
      const chip = page.locator('label[for="tema-familia-internacional"]');
      const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(await styleOf(chip, 'outline-style')).toBe('solid');
      expect(await styleOf(chip, 'outline-color')).not.toBe(canvas);
    });
  }

  test('a linha do tempo das etapas continua visível', async ({ page }) => {
    // mata: o trilho, o progresso e os pontos das etapas só com fundo e sombra (Processo.astro),
    // que o modo trocava pela cor da tela: a linha do tempo sumia inteira
    const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const step = page.locator('[data-step]').first();
    for (const pseudo of ['::before', '::after']) {
      expect(await styleOf(step, 'background-color', pseudo), pseudo).not.toBe(canvas);
    }
    for (const dot of await page.locator('[data-step] .step-dot').all()) {
      // Aceso, o ponto é cheio; apagado, é um anel com a cor do texto.
      const filled = (await styleOf(dot, 'background-color')) !== canvas;
      const ring = (await styleOf(dot, 'box-shadow')) !== 'none';
      expect(filled || ring).toBe(true);
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
    await pageReady(page);
  });

  test('barras do menu, ± do FAQ e altura do header mudam sem animar', async ({ page }) => {
    const instant = [
      [page.locator('[data-menu-toggle] .menu-icon'), '::before'],
      [page.locator('.faq-icon').first(), '::after'],
      [page.locator('[data-header] .header-inner'), undefined],
      [page.locator('[data-wa-cta]'), '::before'],
      [page.locator('#atuacao li a').first(), '::before'],
    ] as const;
    for (const [element, pseudo] of instant) {
      expect(await styleOf(element, 'transition-duration', pseudo)).toBe('0s');
    }
  });

  test('o logo do header esmaece junto com o fundo', async ({ page }) => {
    // mata: transition: none no logo com movimento reduzido (trocava de estalo enquanto o fundo
    // ainda esmaecia: o branco ficava um instante sobre o fundo claro, o azul sobre o azul-noite)
    const header = page.locator('[data-header]');
    // A duração da transição do fundo, na posição dele na lista de propriedades.
    const background = await header.evaluate((node) => {
      const style = getComputedStyle(node);
      const index = style.transitionProperty.split(', ').indexOf('background-color');
      return style.transitionDuration.split(', ')[index];
    });
    expect(background).not.toBe('0s');
    for (const logo of await header.locator('.brand-logo').all()) {
      expect(await styleOf(logo, 'transition-property')).toBe('opacity');
      expect(await styleOf(logo, 'transition-duration')).toBe(background);
    }
  });

  test('nada cresce nem desliza no hover e no toque', async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    const brand = page.locator('[data-header] a').first();
    await brand.hover();
    expect(await styleOf(brand.locator('img').first(), 'transform')).toBe('none');

    // O ícone do WhatsApp não cresce, e a seta da chamada não anda.
    const cta = page.locator('[data-wa-cta]');
    await cta.hover();
    expect(await styleOf(cta.locator('svg').first(), 'transform')).toBe('none');
    expect(await styleOf(cta.locator('svg').last(), 'transform')).toBe('none');
    await page.mouse.down();
    expect(await styleOf(cta, 'transform')).toBe('none');
    await page.mouse.up();

    const chip = page.locator('label[for="tema-familia-internacional"]');
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
      [page.locator('label[for="tema-familia-internacional"]'), 'box-shadow', undefined],
      [page.locator('#atuacao li a').first(), 'transform', '::before'],
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

  test('nas etapas ainda não acesas, o número tem 3:1 e o rótulo "Etapa", 4,5:1', async ({
    page,
  }) => {
    // mata: o rótulo (13 px, texto pequeno) herdando o tom apagado do número (3,29:1)
    await page.goto('/');
    const step = page.locator('[data-step]').last();
    await expect(step).not.toHaveClass(/is-active/);
    const white = parseColor('rgb(255, 255, 255)');
    const number = await styleOf(step.locator('.step-num'), 'color');
    const label = await styleOf(step.locator('.step-label'), 'color');
    expect(contrast(parseColor(number), white)).toBeGreaterThanOrEqual(3);
    expect(contrast(parseColor(label), white)).toBeGreaterThanOrEqual(4.5);
  });

  test('o contorno dos chips não marcados tem contraste de 3:1', async ({ page }) => {
    await page.goto('/');
    const shadow = await styleOf(
      page.locator('label[for="tema-familia-internacional"]'),
      'box-shadow',
    );
    const ring = /rgba?\([^)]+\)/.exec(shadow)?.[0] ?? '';
    expect(contrast(over(ring, ROYAL), parseColor(ROYAL))).toBeGreaterThanOrEqual(3);
  });
});

test.describe('texto que não cabe', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('um e-mail longo quebra em vez de sair da tela', async ({ page }) => {
    await page.goto('/');
    // Os links de e-mail, achados pelo mailto: (e não pelo texto, para o teste valer com qualquer
    // e-mail), ganham um endereço longo.
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

  for (const width of [1080, 1200, 1280]) {
    test(`com o espaçamento de texto ampliado, o botão do header a ${width} px não corta o rótulo nem sai da tela`, async ({
      page,
    }) => {
      // mata: o flex-shrink: 0 do botão do header (o overflow: hidden do .btn zera o min-width, e
      // ele encolhia abaixo do rótulo) ou a quebra de linha do header no desktop (sem ela, o botão
      // que não encolhe sairia da tela)
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.addStyleTag({ content: TEXT_SPACING });
      const button = page.locator('[data-header] .btn-header');
      const box = await button.evaluate((node) => ({
        clipped: node.scrollWidth > node.clientWidth + 1,
        right: node.getBoundingClientRect().right,
        viewport: document.documentElement.clientWidth,
      }));
      expect(box.clipped).toBe(false);
      expect(box.right).toBeLessThanOrEqual(box.viewport);
    });
  }
});

/** Rótulos de botão (.btn-label) que quebram em mais de uma linha, entre os que têm layout. */
function wrappedButtonLabels(page: Page): Promise<string[]> {
  return page.locator('.btn .btn-label').evaluateAll((labels) =>
    labels
      .filter((label) => label.getClientRects().length > 0)
      .filter((label) => {
        const range = document.createRange();
        range.selectNodeContents(label);
        const tops = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
        return tops.size > 1;
      })
      .map((label) => label.textContent.trim()),
  );
}

/**
 * As palavras de cada linha de cada elemento, pelo topo de cada uma, em todos os textos dele (também
 * os de spans internos). O espaço inseparável separa palavras aqui: o \s do JavaScript inclui o
 * U+00A0, e "nº 205/2021" dá duas palavras, que o teste confere se ficam na mesma linha.
 */
function linesOf(elements: Locator): Promise<string[][][]> {
  return elements.evaluateAll((nodes) =>
    nodes.map((node) => {
      const lines: { top: number; words: string[] }[] = [];
      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      for (let text = walker.nextNode(); text; text = walker.nextNode()) {
        for (const match of (text.textContent ?? '').matchAll(/\S+/g)) {
          const range = document.createRange();
          range.setStart(text, match.index);
          range.setEnd(text, match.index + match[0].length);
          const top = range.getBoundingClientRect().top;
          const last = lines.at(-1);
          // Na mesma linha, o topo de cada palavra pode variar por um pixel (spans em linha).
          if (last && Math.abs(last.top - top) < 4) last.words.push(match[0]);
          else lines.push({ top, words: [match[0]] });
        }
      }
      return lines.map(({ words }) => words);
    }),
  );
}

/** As linhas como na tela, separadas por " / ", para a mensagem de erro. */
const show = (lines: string[][]) => lines.map((line) => line.join(' ')).join(' / ');

/** Os elementos de mais de uma linha cuja última linha é uma palavra sozinha, como na tela. */
const withOrphan = (elements: string[][][]) =>
  elements.filter((lines) => lines.length > 1 && lines.at(-1)?.length === 1).map(show);

test.describe('telas estreitas', () => {
  for (const width of [320, 360, 375, 390, 414]) {
    test(`a ${width} px, o rótulo de cada botão fica numa linha só`, async ({ page }) => {
      // mata: o respiro menor das pílulas abaixo de 430 px (buttons.css) ou a letra menor da
      // chamada do hero abaixo de 390 px (Hero.astro); "Fale com o Dr. Diogo Menani" quebrava
      await page.setViewportSize({ width, height: 740 });
      for (const path of ['/', '/nao-existe']) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        expect(await wrappedButtonLabels(page), path).toEqual([]);
      }
    });
  }

  test('no Sobre, "Brasil" não fica sozinho numa linha, também sem o text-wrap: balance', async ({
    page,
  }) => {
    // mata: o espaço inseparável de "no Brasil" (abaixo de 390 px, "Brasil" descia sozinho nos
    // motores sem balance, como o Safari/iOS anterior ao 17.5, que está no alvo). O balance é
    // desligado aqui para imitar esses motores: nos atuais, ele sozinho esconderia a falta.
    for (const width of [320, 360, 375]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/');
      await page.addStyleTag({ content: '.about-line { text-wrap: wrap !important; }' });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      // Quantas palavras cada linha da metade do nome tem.
      const [lines = []] = await linesOf(page.locator('.about-line').first());
      const words = lines.map((line) => line.length);
      expect(Math.min(...words), `${width} px: ${show(lines)}`).toBeGreaterThan(1);
    }
  });
});

test.describe('quebras de linha', () => {
  for (const width of [320, 390]) {
    test(`a ${width} px, perguntas do FAQ e títulos do aviso não deixam uma palavra sozinha na última linha`, async ({
      page,
    }) => {
      // mata: o text-wrap: balance das perguntas (Duvidas.astro) e dos títulos do aviso de
      // privacidade (privacidade.astro): "separar?", "conversa?" e "usados" desciam sozinhos
      await page.setViewportSize({ width, height: 740 });
      const blocks = [
        ['/', '.faq-question'],
        ['/privacidade/', '.privacy-section h2'],
      ] as const;
      const orphans: string[] = [];
      for (const [path, selector] of blocks) {
        await page.goto(path);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const elements = await linesOf(page.locator(selector));
        expect(elements.length, selector).toBeGreaterThan(0);
        orphans.push(...withOrphan(elements));
      }
      expect(orphans).toEqual([]);
    });
  }

  test('na entrada das duas colunas, "Onde podemos ajudar" e "Dúvidas frequentes" ficam em duas linhas', async ({
    page,
  }) => {
    // mata: o piso de 310 px da coluna do título (Areas.astro e Duvidas.astro): de 960 a 974 px,
    // o 4fr dava ~297 px, "Onde podemos" não cabia e o título saía uma palavra por linha
    for (const width of [960, 965, 970, 974]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const titles = await linesOf(page.locator('#atuacao-title, #faq-title'));
      expect(
        titles.map((lines) => lines.length),
        `${width} px: ${titles.map(show).join(' | ')}`,
      ).toEqual([2, 2]);
    }
  });

  test('no rodapé do menu, a frase quebra no "·", entre a inscrição e o modo de atendimento', async ({
    page,
  }) => {
    // mata: a inscrição e o modo de atendimento como dois blocos em linha (MobileMenu.astro): a
    // 320 px, a frase quebrava em "somente / online"
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const meta = page.locator('.menu-foot p');
    const [lines = []] = await linesOf(meta);
    expect(show(lines)).toBe(`${OAB} / · Atendimento somente online`);
    // O espaço entre os blocos continua no texto: o build tira o que é só quebra de linha no código.
    await expect(meta).toHaveText(`${OAB} · Atendimento somente online`);
  });

  test('no aviso legal do rodapé, "nº" fica na linha do número do provimento', async ({ page }) => {
    // mata: o espaço inseparável de "nº 205/2021" (Footer.astro): a 320 e a 1024 px, "nº" ficava
    // no fim de uma linha e "205/2021" no começo da outra
    for (const width of [320, 1024]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const [lines = []] = await linesOf(page.locator('.footer-legal'));
      const line = lines.find((words) => words.includes('nº'));
      expect(line, `${width} px: ${show(lines)}`).toContain('205/2021');
    }
  });

  test('nas descrições das áreas, os compostos com hífen não quebram no hífen', async ({
    page,
  }) => {
    // mata: o nowrap dos compostos (Areas.astro): de 330 a 390 px, "auxílio-" ficava no fim de uma
    // linha e "acidente" no começo da outra
    for (const width of [360, 390]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      // Cada hífen entre letras, com a letra seguinte: os dois na mesma linha.
      const split = await page.locator('#atuacao .area-desc').evaluateAll((descriptions) =>
        descriptions.flatMap((description) => {
          const found: string[] = [];
          const walker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const text = node;
            for (const match of (text.textContent ?? '').matchAll(/\p{L}+-\p{L}+/gu)) {
              const top = (offset: number) => {
                const range = document.createRange();
                range.setStart(text, offset);
                range.setEnd(text, offset + 1);
                return range.getBoundingClientRect().top;
              };
              const hyphen = match.index + match[0].indexOf('-');
              if (Math.abs(top(hyphen) - top(hyphen + 1)) > 2) found.push(match[0]);
            }
          }
          return found;
        }),
      );
      expect(split, `${width} px`).toEqual([]);
    }
  });

  test('no texto de abertura do contato, o "O" fica na linha de "retorno"', async ({ page }) => {
    // mata: o espaço inseparável de "O retorno" (Contato.astro): a 390, a 414 e a 1024 px, o
    // artigo ficava sozinho no fim da primeira linha
    for (const width of [390, 414, 1024]) {
      await page.setViewportSize({ width, height: 740 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const [lines = []] = await linesOf(page.locator('#contato .lede'));
      const line = lines.find((words) => words.includes('O'));
      expect(line, `${width} px: ${show(lines)}`).toContain('retorno');
    }
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
    // O contato continua pelos botões e links do WhatsApp.
    await expect(
      page
        .locator('#contato')
        .getByRole('link', { name: 'Conversar pelo WhatsApp (abre em outra aba)', exact: true }),
    ).toBeAttached();
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
  const lists = page.locator(
    '#como-trabalhamos ol, .facts, #atuacao ul, #contato ul, [data-footer] ul',
  );
  await expect(lists).toHaveCount(7);
  for (const list of await lists.all()) await expect(list).toHaveAttribute('role', 'list');
});

/**
 * Rola em `samples` paradas, levando o topo de `anchor` de `from` a `to` (frações da altura da
 * tela), e anota em cada parada, para cada classe de `classes`, quais `items` a têm.
 */
function classesWhileScrolling(
  page: Page,
  options: { anchor: string; items: string; classes: string[]; from: number; to: number },
  samples = 16,
): Promise<boolean[][][]> {
  return page.evaluate(
    async ({ anchor, items, classes, from, to, stops }) => {
      const target = document.querySelector(anchor);
      if (!target) throw new Error(`${anchor} não existe`);
      const elements = [...document.querySelectorAll(items)];
      const seen: boolean[][][] = [];
      for (let i = 0; i < stops; i++) {
        const top = window.innerHeight * (from + ((to - from) * i) / (stops - 1));
        window.scrollBy({ top: target.getBoundingClientRect().top - top, behavior: 'instant' });
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        seen.push(
          classes.map((name) => elements.map((element) => element.classList.contains(name))),
        );
      }
      return seen;
    },
    { ...options, stops: samples },
  );
}

/** `classesWhileScrolling` com uma classe só: quais `items` estão acesos (com a classe `lit`). */
async function litWhileScrolling(
  page: Page,
  options: { anchor: string; items: string; lit: string; from: number; to: number },
): Promise<boolean[][]> {
  const { lit, ...rest } = options;
  const seen = await classesWhileScrolling(page, { ...rest, classes: [lit] });
  return seen.map(([items = []]) => items);
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
      scroll: { anchor: '[data-step]', items: '[data-step]', lit: 'is-active', from: 1, to: -0.2 },
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

  test('o trilho das etapas acende até a última etapa acesa, sem passar dela', async ({ page }) => {
    // mata: index < active - 1 virando index < active em scroll-effects (o trilho royal chegaria
    // a uma etapa ainda apagada)
    const seen = await classesWhileScrolling(page, {
      anchor: '[data-step]',
      items: '[data-step]',
      classes: ['is-active', 'is-done'],
      from: 1,
      to: -0.2,
    });
    for (const [active = [], done = []] of seen) {
      const lit = active.filter(Boolean).length;
      const count = done.filter(Boolean).length;
      // O trilho cobre um começo da lista: do primeiro passo até o anterior à última acesa.
      expect(done).toEqual(done.map((_, i) => i < count));
      expect(count).toBe(Math.max(lit - 1, 0));
    }
    const counts = seen.map(([, done = []]) => done.filter(Boolean).length);
    expect(new Set(counts).size).toBeGreaterThan(2);
  });

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

test('as linhas das três colunas do rodapé têm o mesmo passo', async ({ page }) => {
  // mata: o vertical-align: top dos links do rodapé (com o ícone, o inline-flex ficava na linha de
  // base e as linhas de Redes, 4 px mais altas que as de Navegação e Contato)
  await page.setViewportSize({ width: 1080, height: 900 });
  await page.goto('/');
  const heights = await page
    .locator('.footer-col li')
    .evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height)));
  expect(new Set(heights).size, heights.join(', ')).toBe(1);
});

test.describe('figura do hero no celular e no tablet', () => {
  for (const width of [320, 414, 600, 768, 834, 959]) {
    test(`a ${width} px, a maior parte da Têmis fica na tela`, async ({ page }) => {
      // mata: o right em % do hero (medido pela largura do hero, e não da figura): no tablet, só a
      // tocha e meio prato ficavam na borda da tela (33% da figura a 768 px, 17% a 959 px)
      await page.setViewportSize({ width, height: 1024 });
      await page.goto('/');
      const shown = await page.locator('[data-figure]').evaluate((figure) => {
        const box = figure.getBoundingClientRect();
        const screen = document.documentElement.clientWidth;
        const visible = Math.min(box.right, screen) - Math.max(box.left, 0);
        return visible / box.width;
      });
      expect(shown).toBeGreaterThan(0.6);
    });
  }
});

test('depois de trocar o tema, o botão principal volta à opacidade 1', async ({ page }) => {
  // mata: leave.cancel() removido em topic-picker (a saída, com fill forwards, prende o rótulo em 0)
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await page.locator('label[for="tema-consumidor"]').click();
  const cta = page.locator('[data-wa-cta]');
  // O rótulo novo entra quando a saída do antigo termina; a entrada começa no mesmo instante.
  await expect(cta.locator('[data-wa-label]')).toHaveText('Fale sobre consumo');
  await cta.evaluate((node) =>
    Promise.all(node.getAnimations({ subtree: true }).map((animation) => animation.finished)),
  );
  for (const element of [cta, cta.locator('[data-wa-label]')]) {
    await expect(element).toHaveCSS('opacity', '1');
  }
});

test('no hover, a seta da chamada anda para a frente', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'hover com mouse de verdade: basta um motor');
  // mata: a regra mirando svg:last-child (o último filho do link é o aviso de outra aba)
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const cta = page.locator('[data-header] .btn-caps');
  await cta.hover();
  const arrow = cta.locator('svg').last();
  await arrow.evaluate((node) =>
    Promise.all(node.getAnimations().map((animation) => animation.finished)),
  );
  expect(await styleOf(arrow, 'transform')).toBe('matrix(1, 0, 0, 1, 3, 0)');
});
