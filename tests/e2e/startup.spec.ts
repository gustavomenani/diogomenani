import { test, expect, jumpToSection, nextFrames, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Altura do header fixo (--header-h): a seção que chega por âncora pousa logo abaixo dele. */
const HEADER_HEIGHT = 84;
/**
 * Elementos cujo estado na tela depende do modo de movimento ou da rolagem: escondidos, apagados,
 * fechados ou, no header, rolado e recolhido.
 */
const MODE_DEPENDENT =
  '[data-reveal], [data-faq-item], [data-step], [data-statement], [data-header]';
/**
 * Seção com as etapas: 120 px além do topo dela, três etapas passam da linha de 70% e acendem. A
 * 1440×900, os topos ficam a uns 70 px de cada lado da linha (a 630 px); com 200 px, acendiam as
 * quatro, e a quarta ficava a 1 ou 2 px da linha.
 */
const STEPS = { id: 'como-trabalhamos', offset: 120 } as const;

type RevealState = 'shown' | 'hidden' | 'partial';

interface Globals {
  __transitions: string[];
  __reveals: { states: Record<number, RevealState[]>; done: boolean };
  __topAtFirstFrame: number;
}

/**
 * Init script: registra, desde o início do documento, cada transição dentro de `selector`, com o
 * id da seção onde ela correu ("#atuacao …").
 */
function recordTransitions(selector: string): void {
  const started: string[] = [];
  Object.defineProperty(window, '__transitions', { value: started });
  document.addEventListener('transitionrun', (event) => {
    const { target } = event;
    if (target instanceof Element && target.closest(selector)) {
      const section = target.closest('section[id]')?.id ?? '';
      started.push(
        `#${section} ${target.getAttribute('class') ?? target.tagName} ${event.propertyName}`,
      );
    }
  });
}

/**
 * Init script: a cada quadro, desde o início do documento até `framesAfterLoad` quadros depois do
 * load, anota o estado de cada bloco revelável que está na tela (pelo índice na página).
 */
function sampleRevealsInView(framesAfterLoad: number): void {
  const states: Record<number, RevealState[]> = {};
  const record = { states, done: false };
  Object.defineProperty(window, '__reveals', { value: record });
  // Os quadros contam a partir do load, não do primeiro quadro: no WebKit a rolagem volta no task
  // do load e, com o load lento (CPU alta, logo e fontes chegando tarde), uma conta desde o início
  // do documento se esgotaria ainda no topo, sem nada revelável na tela.
  let afterLoad = -1;
  addEventListener(
    'load',
    () => {
      afterLoad = 0;
    },
    { once: true },
  );
  const sample = () => {
    document.querySelectorAll('[data-reveal]').forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight) return;
      const style = getComputedStyle(element);
      const opacity = Number(style.opacity);
      const state: RevealState =
        opacity < 0.01 || style.clipPath.includes('100%')
          ? 'hidden'
          : opacity > 0.99
            ? 'shown'
            : 'partial';
      (states[index] ??= []).push(state);
    });
    if (afterLoad >= 0) afterLoad += 1;
    if (afterLoad < framesAfterLoad) requestAnimationFrame(sample);
    else record.done = true;
  };
  requestAnimationFrame(sample);
}

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as Globals).__transitions);

/**
 * Segura o load: o logo do header só termina de chegar quando o teste chama a função devolvida.
 * Com um temporizador, a precondição "antes do load" dependeria do relógio e, sob CPU alta, o load
 * poderia chegar antes do teste.
 */
async function holdLoad(page: Page): Promise<() => void> {
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/logo-compact-white.svg', async (route) => {
    await held;
    await route.continue();
  });
  return release;
}

/** Leva a seção ao alto da tela (abaixo do header) e desce mais `offset` px, sem animação. */
async function jumpPast(page: Page, id: string, offset = 0): Promise<void> {
  await page.evaluate(
    ([sectionId, extra]) => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });
      window.scrollBy({ top: extra, behavior: 'instant' });
    },
    [id, offset] as const,
  );
}

/** Para cada bloco revelável de `section` que está na tela, se ele já apareceu (is-in). */
const revealedOnScreen = (page: Page, section: string) =>
  page.locator(`${section} [data-reveal]`).evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < innerHeight;
      })
      .map((element) => element.classList.contains('is-in')),
  );

/**
 * Depois da rolagem que chegou antes do load, a página está como se tivesse aberto ali: nada
 * transicionou (blocos, etapas, header), os blocos das etapas na tela já apareceram, as etapas
 * acenderam e o header ficou à mostra, porque o salto do topo até lá não foi o visitante descendo.
 */
async function expectStepsAsTheyWere(page: Page): Promise<void> {
  const [lit, tucked] = await page.evaluate(() => [
    document.querySelectorAll('[data-step].is-active').length,
    document.querySelector('[data-header]')?.classList.contains('is-tucked'),
  ]);
  expect(await transitions(page)).toEqual([]);
  const onScreen = await revealedOnScreen(page, `#${STEPS.id}`);
  expect(onScreen.length).toBeGreaterThan(3);
  expect(onScreen.filter((shown) => !shown)).toEqual([]);
  expect(lit, 'etapas acesas').toBe(3);
  expect(tucked, 'header recolhido').toBe(false);
}

test('ao abrir, FAQ, etapas e palavras nascem no estado certo, sem animar', async ({ page }) => {
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  await page.goto('/');
  await nextFrames(page, 3);
  expect(await transitions(page)).toEqual([]);
});

// Em #atuacao, os blocos revelados; nas etapas, também as que acendem pela rolagem. O header, nos
// dois casos, chega rolado e à mostra.
for (const { id, heading, offset } of [
  { id: 'atuacao', heading: 'Onde podemos ajudar', offset: 0 },
  { ...STEPS, heading: 'Como trabalhamos' },
]) {
  test(`recarregar no meio da página (#${id}) não pisca nem anima o que está na tela`, async ({
    page,
  }) => {
    // Os registros recomeçam a cada carga: o que se confere no fim é só o último reload.
    await page.addInitScript(recordTransitions, MODE_DEPENDENT);
    await page.addInitScript(sampleRevealsInView, 40);
    await page.goto('/');
    // Só a precondição se repete: o WebKit leva uns instantes para gravar a rolagem no histórico
    // e, sob CPU alta, às vezes o reload volta ao topo, o que é do motor, não do site. Cada
    // tentativa rola de novo, porque o reload que voltou ao topo deixa o topo gravado.
    await expect(async () => {
      // Como quem lê antes de rolar: uma rolagem antes do primeiro quadro depois do load ainda
      // conta como a volta da rolagem no recarregar (main.ts), a seção aparece sem animar e a
      // espera abaixo não espera nada.
      await nextFrames(page, 2);
      await jumpPast(page, id, offset);
      // Dá ao WebKit o tempo de gravar a rolagem: a seção termina de aparecer antes do reload.
      await expect(page.getByRole('heading', { name: heading })).toHaveClass(/is-in/);
      await page.waitForFunction(
        (sectionId) =>
          document.getElementById(sectionId)?.getAnimations({ subtree: true }).length === 0,
        id,
      );
      await page.reload();
      await page.waitForFunction(() => (window as unknown as Globals).__reveals.done);
      expect(
        await page.evaluate(() => scrollY),
        'o reload voltou ao meio da página',
      ).toBeGreaterThan(0);
    }).toPass({ timeout: 20_000 });

    const { states } = await page.evaluate(() => (window as unknown as Globals).__reveals);
    expect(Object.keys(states).length).toBeGreaterThan(3);
    // Pisca: um bloco que já apareceu inteiro some de novo.
    const flashes = Object.entries(states).filter(([, sequence]) =>
      sequence.some((state, i) => state === 'shown' && sequence.slice(i + 1).includes('hidden')),
    );
    expect(flashes).toEqual([]);
    expect(await transitions(page)).toEqual([]);
    await expect(page.locator('[data-header]')).not.toHaveClass(/is-tucked/);
  });
}

test('a rolagem que chega antes do load mostra o que está na tela sem animar; depois, a entrada volta a animar', async ({
  page,
}) => {
  // mata: a escuta de rolagem até o load em main.ts (sem ela, a seção que o WebKit devolve perto
  // do load entra animando, as etapas acendem animando e o header recolhe) e a saída dela no load
  // (sem a saída, nenhuma entrada anima mais). É o caso do recarregar no WebKit, sem depender do
  // motor: o logo do header segura o load, e a rolagem chega depois do início do módulo e antes do
  // load. A rolagem que chega no próprio load fica com o teste seguinte.
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  const releaseLoad = await holdLoad(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
  // O load só chega quando o teste solta o logo: a conferência fica como rede de segurança (se a
  // rota deixar de segurar o load, o teste avisa em vez de passar sem testar nada).
  const loadedBeforeScroll = await page.evaluate(({ id, offset }) => {
    const complete = document.readyState === 'complete';
    document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
    window.scrollBy({ top: offset, behavior: 'instant' });
    return complete;
  }, STEPS);
  expect(loadedBeforeScroll, 'a rolagem chegou antes do load').toBe(false);
  await nextFrames(page, 3);
  await expectStepsAsTheyWere(page);

  // Só agora o logo é solto: com o load livre logo depois da rolagem, ele poderia chegar antes do
  // quadro da rolagem, e o requestAnimationFrame do listener de load mostraria a seção mesmo sem a
  // escuta de rolagem.
  releaseLoad();
  // Depois do load, a escuta sai e a entrada do FAQ anima. Só as do FAQ contam: as etapas, que
  // ficam para trás na rolagem, mudam de estado pelos efeitos de rolagem, com ou sem a escuta.
  await page.waitForLoadState('load');
  await nextFrames(page, 2);
  await jumpToSection(page, 'duvidas');
  await expect.poll(() => transitions(page)).toContainEqual(expect.stringMatching(/^#duvidas /));
});

test('a rolagem que o navegador devolve no próprio load, depois dos listeners, mostra o que está na tela sem animar', async ({
  page,
}) => {
  // mata: o requestAnimationFrame do listener de load em main.ts. Sem ele, a escuta sai no load,
  // antes da volta da rolagem que o WebKit faz no mesmo task quando os assets atrasam o load, e a
  // seção entra animando.
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  const releaseLoad = await holdLoad(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
  // Registrado depois do listener de main.ts, este roda depois dele, como a volta da rolagem no
  // WebKit. O load só chega quando o teste solta o logo: a conferência fica como rede de segurança.
  const loadedBeforeListener = await page.evaluate(({ id, offset }) => {
    const complete = document.readyState === 'complete';
    addEventListener(
      'load',
      () => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'instant' });
        window.scrollBy({ top: offset, behavior: 'instant' });
      },
      { once: true },
    );
    return complete;
  }, STEPS);
  expect(loadedBeforeListener, 'o listener entrou antes do load').toBe(false);
  releaseLoad();
  await page.waitForLoadState('load');
  await nextFrames(page, 3);
  await expectStepsAsTheyWere(page);
});

test('a rolagem do próprio visitante antes do load anima e recolhe o header como depois dele', async ({
  page,
}) => {
  // mata: o fim da janela da volta do recarregar na primeira ação do visitante (main.ts): sem ele,
  // quem rolava antes do load (rede lenta) via tudo surgir sem animar, o header nunca recolhia, e
  // cada evento de rolagem desligava as transições da página inteira
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  const releaseLoad = await holdLoad(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
  await page.mouse.move(720, 450);
  // A roda, e não um scrollBy: é uma ação do visitante (wheel), como a rolagem de quem lê.
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 500);
    await nextFrames(page, 2);
  }
  await expect(page.locator('[data-header]')).toHaveClass(/is-tucked/);
  // Um bloco revelado na rolagem animou (transitionrun dentro de uma seção).
  await expect.poll(() => transitions(page)).toContainEqual(expect.stringMatching(/^#[a-z-]+ /));
  // O load só chega quando o teste solta o logo: a conferência fica como rede de segurança.
  expect(
    await page.evaluate(() => document.readyState),
    'a rolagem e as conferências vieram antes do load',
  ).not.toBe('complete');
  releaseLoad();
});

test('abrir por âncora pousa direto na seção, abaixo do header', async ({ page }) => {
  // No primeiro quadro depois do load. Os motores aplicam a âncora em momentos diferentes: o
  // Chromium, no primeiro quadro, que pode vir depois do load; o WebKit, no load, que pode vir
  // depois do primeiro quadro. Uma rolagem suave em andamento ainda estaria longe da seção aqui.
  await page.addInitScript(() => {
    addEventListener('load', () => {
      requestAnimationFrame(() => {
        const top = document.getElementById('contato')?.getBoundingClientRect().top;
        Object.defineProperty(window, '__topAtFirstFrame', { value: top });
      });
    });
  });
  await page.goto('/#contato');
  await page.waitForFunction(() => '__topAtFirstFrame' in window);
  const topAtFirstFrame = await page.evaluate(
    () => (window as unknown as Globals).__topAtFirstFrame,
  );
  expect(
    Math.abs(topAtFirstFrame - HEADER_HEIGHT),
    `topo no primeiro quadro: ${topAtFirstFrame}px`,
  ).toBeLessThanOrEqual(2);
  // E fica: nenhuma rolagem suave em andamento depois do primeiro quadro.
  await nextFrames(page, 10);
  const top = await page.evaluate(
    () => document.getElementById('contato')?.getBoundingClientRect().top ?? NaN,
  );
  expect(Math.abs(top - HEADER_HEIGHT), `topo depois: ${top}px`).toBeLessThanOrEqual(2);
});
