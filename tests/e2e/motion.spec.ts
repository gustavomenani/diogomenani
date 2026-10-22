import {
  test,
  expect,
  countHiddenReveals,
  jumpTo,
  jumpToSection,
  SUBMIT,
  type Page,
} from './fixtures';

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
    await page.getByRole('button', { name: SUBMIT, exact: true }).click();
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

  test('sem o módulo da página, a balança já aparece na pose nivelada do módulo', async ({
    page,
  }) => {
    // mata: a pose nivelada só pelo settle() do módulo (o desenho vem ~23° inclinado: sem o
    // módulo a balança ficava torta, e com a rede lenta girava num quadro só quando ele chegava,
    // com a figura já à mostra)
    /** Posição do travessão e dos pratos dentro da figura (a entrada da figura não conta). */
    const geometry = () =>
      page.evaluate(() => {
        const svg = document.querySelector('[data-beam]')?.closest('svg')?.getBoundingClientRect();
        const parts = ['[data-beam]', '[data-pan-l]', '[data-pan-r]'].map((selector) => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return [(rect?.left ?? 0) - (svg?.left ?? 0), (rect?.top ?? 0) - (svg?.top ?? 0)];
        });
        return { height: svg?.height ?? 0, parts: parts.flat() };
      });
    await page.route('**/_astro/*.js', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('[data-page]')).toHaveAttribute('data-fallback', '');
    // Sem o módulo, quem nivela é só o CSS: o atributo do desenho continua sem rotação.
    await expect(page.locator('[data-beam]')).not.toHaveAttribute('transform');
    const withoutModule = await geometry();
    expect(withoutModule.height).toBeGreaterThan(400);

    await page.unroute('**/_astro/*.js');
    await page.goto('/');
    await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
    expect(await balancePose(page)).toEqual(LEVEL_POSE);
    const withModule = await geometry();
    expect(withModule.height).toBeCloseTo(withoutModule.height, 0);
    const drift = withModule.parts.map((value, i) =>
      Math.abs(value - (withoutModule.parts[i] ?? 0)),
    );
    expect(Math.max(...drift)).toBeLessThanOrEqual(1);
  });

  test('o menu do celular esmaece, sem a cortina, e links e rodapé entram junto', async ({
    page,
  }) => {
    // mata: o clip-path da cortina animando no modo reduzido (varria a tela inteira a cada
    // abertura) e os atrasos dos links (escalonados) e do rodapé do menu (0,45 s)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const menu = page.locator('[data-menu]');
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toBeVisible();
    await expect(menu).toHaveCSS('clip-path', 'none');
    await expect(menu).not.toHaveCSS('transition-property', /clip-path/);
    for (const element of [menu.locator('.menu-nav a').last(), menu.locator('.menu-foot')]) {
      await expect(element).toHaveCSS('transition-delay', '0s');
      await expect(element).toHaveCSS('opacity', '1');
    }
  });
});

test.describe('com movimento', () => {
  test('com movimento o conteúdo revela ao entrar na tela', async ({ page }) => {
    await page.goto('/');
    const title = page.getByRole('heading', { name: 'Fale com um especialista' });
    await expect(title).not.toHaveClass(/is-in/);
    await title.scrollIntoViewIfNeeded();
    await expect(title).toHaveClass(/is-in/);
  });

  test('o item de uma lista que a rolagem traz sozinho começa a entrar na hora', async ({
    page,
  }) => {
    // mata: o atraso do escalonamento pelo índice na lista (reveal.ts). No celular, as áreas
    // cruzam a borda da tela uma de cada vez, e cada uma esperava parada e invisível até 270 ms
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const delays = await page.evaluate(async () => {
      const items = [...document.querySelectorAll<HTMLElement>('#atuacao [data-reveal-list] > *')];
      const seen = new Map<number, string>();
      // 20 px por quadro, como quem lê: as áreas têm uns 200 px de altura cada uma. O primeiro
      // quadro vem antes da primeira rolagem: é o do load (ver jumpTo em fixtures.ts).
      for (let i = 0; i < 400 && seen.size < items.length; i++) {
        await new Promise(requestAnimationFrame);
        items.forEach((item, index) => {
          if (!seen.has(index) && item.classList.contains('is-in')) {
            seen.set(index, item.style.getPropertyValue('--d'));
          }
        });
        window.scrollBy({ top: 20, behavior: 'instant' });
      }
      return items.map((_, index) => seen.get(index));
    });
    expect(delays).toEqual(['', '', '', '']);
  });

  test('os itens de uma lista que entram juntos na tela continuam escalonados', async ({
    page,
  }) => {
    await page.goto('/');
    await jumpToSection(page, 'como-trabalhamos');
    const steps = page.locator('[data-step]');
    await expect(steps.first()).toHaveClass(/is-in/);
    const delays = await steps.evaluateAll((items) =>
      items
        .filter((item) => item.classList.contains('is-in'))
        .map((item) => (item as HTMLElement).style.getPropertyValue('--d')),
    );
    expect(delays.length).toBeGreaterThan(1);
    expect(delays).toEqual(['', '90ms', '180ms', '270ms'].slice(0, delays.length));
  });

  test('as etapas acendem pela posição de layout, também durante a entrada animada', async ({
    page,
  }) => {
    await page.goto('/');
    const counts = await page.evaluate(async () => {
      const list = document.querySelector('[data-step]')?.parentElement;
      if (!list) throw new Error('lista das etapas não existe');
      // Depois do quadro do load (ver jumpTo em fixtures.ts), para as etapas entrarem animando.
      await new Promise(requestAnimationFrame);
      // A primeira etapa 10 px acima da linha de 70% da tela: pelo layout, acesa. Deslocada pela
      // entrada (24 px para baixo), ela ficaria abaixo da linha e apagada.
      const offset = list.getBoundingClientRect().top - (window.innerHeight * 0.7 - 10);
      window.scrollBy({ top: offset, behavior: 'instant' });
      // Rola 1 px por quadro enquanto as etapas entram, cada uma deslocada pela própria transição.
      const seen: number[] = [];
      for (let i = 0; i < 30; i++) {
        await new Promise(requestAnimationFrame);
        window.scrollBy({ top: 1, behavior: 'instant' });
        seen.push(document.querySelectorAll('[data-step].is-active').length);
      }
      return seen;
    });
    expect(new Set(counts.slice(2))).toEqual(new Set([1]));
  });

  test('o ponto da etapa que acende troca a sombra com transição, e não de estalo', async ({
    page,
  }) => {
    // mata: a sombra inset do ponto apagado e a externa do aceso (Processo.astro), que não se
    // interpolam: o halo surgia inteiro no primeiro quadro, enquanto fundo e escala ainda mudavam
    await page.goto('/');
    const transitions = await page.evaluate(async () => {
      const step = document.querySelector('[data-step]');
      const dot = step?.querySelector('.step-dot');
      if (!step || !dot) throw new Error('etapa sem o ponto');
      if (step.classList.contains('is-active')) throw new Error('a etapa já começou acesa');
      // Depois do quadro do load (ver jumpTo em fixtures.ts): antes dele, a etapa acenderia sem
      // transição.
      await new Promise(requestAnimationFrame);
      // A primeira etapa acima da linha de 70% da tela, que a acende.
      const offset = step.getBoundingClientRect().top - (window.innerHeight * 0.7 - 40);
      window.scrollBy({ top: offset, behavior: 'instant' });
      for (let i = 0; i < 60 && !step.classList.contains('is-active'); i++) {
        await new Promise(requestAnimationFrame);
      }
      if (!step.classList.contains('is-active')) throw new Error('a etapa não acendeu');
      return dot
        .getAnimations()
        .map((animation) =>
          animation instanceof CSSTransition ? animation.transitionProperty : '',
        )
        .sort();
    });
    expect(transitions).toEqual(['background-color', 'box-shadow', 'transform']);
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

test.describe('trocar a preferência depois da entrada', () => {
  /** Animações de entrada (motion.css) em andamento. */
  const runningEntrance = (page: Page) =>
    page.evaluate(() => {
      const ENTRANCE = ['rise', 'fade-up', 'fade', 'draw', 'spark', 'figure-unveil', 'drop'];
      return document
        .getAnimations()
        .filter(
          (animation) =>
            animation instanceof CSSAnimation &&
            animation.playState === 'running' &&
            ENTRANCE.includes(animation.animationName),
        )
        .map((animation) => (animation as CSSAnimation).animationName);
    });

  test('não reinicia a entrada do hero, do header e do seletor de tema', async ({ page }) => {
    // mata: as regras de animation de entrada sem o :not([data-entered]) (trocar o
    // animation-name com a página aberta cria uma animação nova: a primeira tela piscava ao ligar
    // "reduzir movimento", e a coreografia toda rodava de novo ao desligar)
    const root = page.locator('[data-page]');
    await page.goto('/');
    await expect(root).toHaveAttribute('data-entered', '', { timeout: 15_000 });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(root).toHaveAttribute('data-motion', 'reduced');
    expect(await runningEntrance(page)).toEqual([]);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await expect(root).toHaveAttribute('data-motion', 'on');
    expect(await runningEntrance(page)).toEqual([]);
  });
});

test.describe('com o módulo da página atrasado', () => {
  // Tablet em retrato: o hero não ocupa a tela, e o Sobre já aparece na primeira pintura.
  test.use({ viewport: { width: 768, height: 1024 } });

  test('o que está na tela na primeira pintura não some até o módulo chegar', async ({ page }) => {
    // mata: os estados escondidos da revelação sem o [data-ready] (o Sobre ficava invisível até o
    // módulo chegar e aparecia de estalo)
    await page.route('**/_astro/*.js', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });
    // A cada quadro, até o módulo marcar data-ready, a opacidade do logo do Sobre.
    await page.addInitScript(() => {
      const seen: string[] = [];
      Object.defineProperty(window, '__aboutBeforeReady', { value: seen });
      const sample = () => {
        const root = document.querySelector<HTMLElement>('[data-page]');
        if (root && 'ready' in root.dataset) return;
        const logo = document.querySelector('.about-logo');
        if (logo) seen.push(getComputedStyle(logo).opacity);
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await page.goto('/');
    await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
    const seen = await page.evaluate(
      () => (window as unknown as { __aboutBeforeReady: string[] }).__aboutBeforeReady,
    );
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.filter((opacity) => opacity !== '1')).toEqual([]);
    // Depois do módulo, o que ficou fora da tela espera a rolagem para aparecer.
    const later = page.locator('#contato [data-reveal]:not([data-reveal="rise"])').first();
    await expect(later).not.toHaveClass(/is-in/);
    await expect(later).toHaveCSS('opacity', '0');
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
