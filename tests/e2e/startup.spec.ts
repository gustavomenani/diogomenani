import { test, expect, jumpToSection, nextFrames, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Altura do header fixo (--header-h): a seção que chega por âncora pousa logo abaixo dele. */
const HEADER_HEIGHT = 84;
/** Elementos cujo estado na tela depende do modo de movimento: escondidos, apagados ou fechados. */
const MODE_DEPENDENT = '[data-reveal], .faq-list, [data-step], [data-statement]';

type RevealState = 'shown' | 'hidden' | 'partial';

interface Globals {
  __transitions: string[];
  __reveals: { states: Record<number, RevealState[]>; done: boolean };
  __topAtLoad: number;
}

/** Init script: registra, desde o início do documento, cada transição dentro de `selector`. */
function recordTransitions(selector: string): void {
  const started: string[] = [];
  Object.defineProperty(window, '__transitions', { value: started });
  document.addEventListener('transitionrun', (event) => {
    const { target } = event;
    if (target instanceof Element && target.closest(selector)) {
      started.push(`${target.getAttribute('class') ?? target.tagName} ${event.propertyName}`);
    }
  });
}

/**
 * Init script: a cada quadro, desde o início do documento, anota o estado de cada bloco
 * revelável que está na tela (pelo índice na página).
 */
function sampleRevealsInView(frames: number): void {
  const states: Record<number, RevealState[]> = {};
  const record = { states, done: false };
  Object.defineProperty(window, '__reveals', { value: record });
  let count = 0;
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
    count += 1;
    if (count < frames) requestAnimationFrame(sample);
    else record.done = true;
  };
  requestAnimationFrame(sample);
}

const transitions = (page: Page) =>
  page.evaluate(() => (window as unknown as Globals).__transitions);

test('ao abrir, FAQ, etapas e palavras nascem no estado certo, sem animar', async ({ page }) => {
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  await page.goto('/');
  await nextFrames(page, 3);
  expect(await transitions(page)).toEqual([]);
});

test('recarregar no meio da página não pisca nem anima o que está na tela', async ({ page }) => {
  await page.goto('/');
  await jumpToSection(page, 'atuacao');
  // O WebKit leva uns instantes para gravar a rolagem no histórico (sem isso, o reload volta ao
  // topo): espera a seção terminar de aparecer antes de recarregar.
  await expect(page.getByRole('heading', { name: 'Áreas de atuação' })).toHaveClass(/is-in/);
  await page.waitForFunction(
    () => document.getElementById('atuacao')?.getAnimations({ subtree: true }).length === 0,
  );
  await page.addInitScript(recordTransitions, MODE_DEPENDENT);
  await page.addInitScript(sampleRevealsInView, 40);
  await page.reload();
  await page.waitForFunction(() => (window as unknown as Globals).__reveals.done);

  const { states } = await page.evaluate(() => (window as unknown as Globals).__reveals);
  expect(Object.keys(states).length).toBeGreaterThan(3);
  // Pisca: um bloco que já apareceu inteiro some de novo.
  const flashes = Object.entries(states).filter(([, sequence]) =>
    sequence.some((state, i) => state === 'shown' && sequence.slice(i + 1).includes('hidden')),
  );
  expect(flashes).toEqual([]);
  expect(await transitions(page)).toEqual([]);
});

test('abrir por âncora pousa direto na seção, abaixo do header', async ({ page }) => {
  await page.addInitScript(() => {
    addEventListener('load', () => {
      const top = document.getElementById('contato')?.getBoundingClientRect().top;
      Object.defineProperty(window, '__topAtLoad', { value: top });
    });
  });
  await page.goto('/#contato');
  const topAtLoad = await page.evaluate(() => (window as unknown as Globals).__topAtLoad);
  expect(Math.abs(topAtLoad - HEADER_HEIGHT), `topo no load: ${topAtLoad}px`).toBeLessThanOrEqual(
    2,
  );
  // E fica: nenhuma rolagem suave em andamento depois do load.
  await nextFrames(page, 10);
  const top = await page.evaluate(
    () => document.getElementById('contato')?.getBoundingClientRect().top ?? NaN,
  );
  expect(Math.abs(top - HEADER_HEIGHT), `topo depois: ${top}px`).toBeLessThanOrEqual(2);
});
