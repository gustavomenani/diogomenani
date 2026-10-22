import { test, expect, jumpTo, jumpToSection } from './fixtures';

test.use({ viewport: { width: 390, height: 844 } });

test('o botão flutuante aparece depois do hero e some perto do contato', async ({ page }) => {
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  await expect(fab).not.toHaveClass(/is-visible/);
  await jumpTo(page, 1500);
  await expect(fab).toHaveClass(/is-visible/);
  await jumpToSection(page, 'contato');
  await expect(fab).not.toHaveClass(/is-visible/);
});

test('uma resposta do FAQ que empurra o contato para baixo traz o botão de volta', async ({
  page,
}) => {
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  // Base do botão do contato a 820 px do topo, com ele inteiro na tela (844 px): o flutuante some.
  // A resposta aberta (uns 90 px) empurra o botão do contato para baixo da borda, e o flutuante
  // volta. Antes, um quadro, como no jumpTo (fixtures.ts): até o quadro do load, a rolagem conta
  // como a volta do recarregar.
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame);
    const cta = document.querySelector('#contato [data-contact-cta]');
    if (!cta) throw new Error('o botão do contato não existe');
    window.scrollBy({ top: cta.getBoundingClientRect().bottom - 820, behavior: 'instant' });
  });
  await expect(fab).not.toHaveClass(/is-visible/);
  await page.getByRole('button', { name: 'O que eu contar fica em sigilo?' }).click();
  await expect(fab).toHaveClass(/is-visible/);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 360, height: 640 },
  { width: 768, height: 1024 },
  { width: 1024, height: 1366 },
]) {
  test(`a ${viewport.width}x${viewport.height}, do fim do FAQ ao botão do contato sempre há um botão do WhatsApp na tela`, async ({
    page,
  }) => {
    // mata: a regra "perto do contato" pelo topo da seção a 80% da tela (isFabVisible): o
    // flutuante sumia com o botão do contato ainda abaixo do título e do texto de abertura, e
    // sobravam de 130 a 300 px de rolagem sem nenhum dos dois. E o ctaShown dela: o flutuante
    // sumia quando a base do botão do contato entrava na tela, mas o bloco desse botão só aparece
    // quando o topo dele passa da linha de revelação (92% da tela, em reveal.ts), e sobravam de
    // 12 a 52 px com o botão do contato na tela, mas invisível
    await page.setViewportSize(viewport);
    await page.goto('/');
    // Rola em passos de 4 px (menos que a menor dessas faixas), do contato na borda de baixo da
    // tela até o botão do contato estar inteiro nela com folga, e anota em cada passo se o
    // flutuante está à mostra, onde fica a base do botão do contato e se o bloco dele já apareceu.
    // Antes, um quadro, como no jumpTo (fixtures.ts).
    const steps = await page.evaluate(async () => {
      const frame = () => new Promise(requestAnimationFrame);
      await frame();
      const contact = document.getElementById('contato');
      const cta = document.querySelector('#contato [data-contact-cta]');
      const fab = document.querySelector('[data-fab]');
      if (!contact || !cta || !fab) throw new Error('falta o contato, o botão dele ou o flutuante');
      const block = cta.closest('[data-reveal]');
      const start = window.scrollY + contact.getBoundingClientRect().top - window.innerHeight;
      const seen: { y: number; fab: boolean; ctaBottom: number; shown: boolean }[] = [];
      for (let y = start; seen.length < 600; y += 4) {
        window.scrollTo({ top: y, behavior: 'instant' });
        // Um quadro para o evento de rolagem e outro para o quadro que ele agenda (e para a
        // revelação, que o IntersectionObserver entrega depois do quadro).
        await frame();
        await frame();
        const ctaBottom = cta.getBoundingClientRect().bottom;
        seen.push({
          y,
          fab: fab.classList.contains('is-visible'),
          ctaBottom,
          shown: block?.classList.contains('is-in') ?? true,
        });
        if (ctaBottom < window.innerHeight - 60) break;
      }
      return seen;
    });
    // O percurso começa com o flutuante à mostra e termina com ele escondido: a troca aconteceu.
    expect(steps[0]?.fab).toBe(true);
    expect(steps.at(-1)?.fab).toBe(false);
    const empty = steps.filter(
      (step) => !step.fab && !(step.shown && step.ctaBottom <= viewport.height),
    );
    expect(empty, 'posições sem nenhum botão do WhatsApp na tela').toEqual([]);
  });
}

test('apertado, o botão flutuante encolhe um pouco, como os outros botões', async ({
  page,
  context,
}) => {
  // mata: o .fab.is-visible:active (WhatsAppFab.astro): no toque, onde o hover não existe, o botão
  // não confirmava o aperto
  // Soltar o botão abre a conversa numa aba nova: o wa.me responde daqui, sem sair para a rede.
  await context.route('https://wa.me/**', (route) => route.fulfill({ body: '' }));
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  await jumpTo(page, 1500);
  await expect(fab).toHaveClass(/is-visible/);
  const transform = () =>
    fab.evaluate(async (node) => {
      await Promise.all(node.getAnimations().map((animation) => animation.finished));
      return getComputedStyle(node).transform;
    });
  expect(await transform()).toBe('none');
  await fab.hover();
  await page.mouse.down();
  expect(await transform()).toBe('matrix(0.96, 0, 0, 0.96, 0, 0)');
  await page.mouse.up();
});

test('com movimento reduzido, o botão que some sai do Tab junto com o esmaecimento', async ({
  page,
}) => {
  // mata: o atraso de 0,8 s do visibility com movimento reduzido (WhatsAppFab.astro): o botão já
  // invisível continuava focável por quase 1 s depois de sumir
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  await jumpTo(page, 1500);
  await expect(fab).toHaveClass(/is-visible/);
  await fab.evaluate((node) =>
    Promise.all(node.getAnimations().map((animation) => animation.finished)),
  );
  // Tudo num evaluate só: o fim do esmaecimento é medido a partir do quadro em que o botão some.
  const hidden = await fab.evaluate(async (node) => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    for (let i = 0; i < 60 && node.classList.contains('is-visible'); i++) {
      await new Promise(requestAnimationFrame);
    }
    if (node.classList.contains('is-visible')) throw new Error('o botão não sumiu no topo');
    const fades = node
      .getAnimations()
      .filter(
        (animation) =>
          animation instanceof CSSTransition && animation.transitionProperty === 'opacity',
      );
    await Promise.all(fades.map((animation) => animation.finished));
    await new Promise(requestAnimationFrame);
    if (node instanceof HTMLElement) node.focus();
    return {
      opacity: getComputedStyle(node).opacity,
      visibility: getComputedStyle(node).visibility,
      focused: document.activeElement === node,
    };
  });
  expect(hidden).toEqual({ opacity: '0', visibility: 'hidden', focused: false });
});

test('ao abrir o menu, o botão flutuante some esmaecendo, sem estalo', async ({ page }) => {
  // mata: a transição própria do botão com o menu aberto (valia a de .is-visible, com a
  // visibility sem atraso, e ele sumia no primeiro quadro, antes de a cortina chegar até ele)
  await page.goto('/');
  const fab = page.locator('[data-fab]');
  await jumpTo(page, 1500);
  await expect(fab).toHaveClass(/is-visible/);
  await fab.evaluate((node) =>
    Promise.all(node.getAnimations().map((animation) => animation.finished)),
  );
  // Logo depois do clique: ainda visível, começando a esmaecer.
  const visibility = await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-menu-toggle]')?.click();
    const button = document.querySelector('[data-fab]');
    return button ? getComputedStyle(button).visibility : null;
  });
  expect(visibility).toBe('visible');
  // No fim do esmaecimento, escondido de fato (fora do Tab e do toque).
  await expect(fab).toHaveCSS('visibility', 'hidden');
  await expect(fab).toHaveCSS('opacity', '0');
});
