import { initBalance, TOPIC_IMPULSE } from './balance';
import { initContactForm } from './contact-form';
import { initFaq } from './faq';
import { initMenu } from './menu';
import {
  detectMotionMode,
  isStaticPage,
  REDUCED_MOTION_QUERY,
  setMode,
  withoutTransitions,
  type MotionMode,
} from './motion-mode';
import { initReveal } from './reveal';
import { initScrollEffects } from './scroll-effects';
import { initTopicPicker } from './topic-picker';

/**
 * Inicia um recurso isolado: se ele lançar, o erro é registrado (reportError) e a página segue
 * com `fallback`.
 */
function attempt<T>(name: string, init: () => T, fallback: T): T {
  try {
    return init();
  } catch (error) {
    reportError(new Error(`Falha ao iniciar: ${name}`, { cause: error }));
    return fallback;
  }
}

/** `attempt` para recursos que não devolvem nada: diz se o recurso iniciou. */
function tryInit(name: string, init: () => void): boolean {
  return attempt(
    name,
    () => {
      init();
      return true;
    },
    false,
  );
}

/**
 * Liga o comportamento da página: revelações, balança da Têmis, seletor de tema, menu mobile,
 * FAQ, formulário de contato e efeitos de rolagem. `root` é a raiz [data-page].
 * O que a inicialização muda (modo, blocos já na tela, header, etapas) aparece direto no estado
 * certo, sem animar. No fim, a raiz ganha data-ready: sem ele, o script inline do Base.astro
 * devolve a página ao modo sem script.
 */
export function initPage(root: HTMLElement): void {
  withoutTransitions(root, () => {
    startPage(root);
  });
  root.dataset.ready = '';
}

function startPage(root: HTMLElement): void {
  let mode: MotionMode = detectMotionMode();
  const getMode = () => mode;
  root.dataset.motion = mode;

  // Revelação e FAQ têm estados escondidos no CSS: se um deles falhar, a página volta ao modo sem
  // script, em que tudo aparece. Nesse modo o FAQ não inicia e fica como no HTML, todo aberto.
  const reveal = attempt('revelação', () => initReveal(root, getMode), null);
  const fallback =
    reveal === null ||
    !tryInit('FAQ', () => {
      initFaq(root);
    });
  if (fallback) root.dataset.motion = 'pending';

  const balance = attempt('balança', () => initBalance(root, getMode), null);
  tryInit('seletor de tema', () => {
    initTopicPicker(root, {
      getMode,
      onPick: () => {
        balance?.swing((Math.random() < 0.5 ? -1 : 1) * TOPIC_IMPULSE);
      },
    });
  });
  const menu = attempt('menu', () => initMenu(root), { isOpen: () => false });
  tryInit('formulário', () => {
    initContactForm(root);
  });
  const scroll = attempt(
    'efeitos de rolagem',
    () => initScrollEffects(root, { getMode, isMenuOpen: () => menu.isOpen() }),
    null,
  );

  /** Passa a outro modo como se a página tivesse aberto nele, sem animar a troca. */
  const applyMode = (next: MotionMode) => {
    if (next === mode) return;
    mode = next;
    if (fallback) return;
    setMode(root, next, () => {
      if (next !== 'on') reveal.revealAll();
      if (next === 'reduced') balance?.settle();
      scroll?.reset();
    });
  };

  window.matchMedia(REDUCED_MOTION_QUERY).addEventListener('change', () => {
    applyMode(detectMotionMode());
  });

  // Uma página que nasceu "estática" (sem rolagem) passa a animar quando começa a rolar.
  const onResize = () => {
    if (mode === 'static' && !isStaticPage()) applyMode('on');
    scroll?.refresh();
  };
  window.addEventListener('resize', onResize, { passive: true });
  // A altura da página também muda com a janela parada: fontes que chegam, resposta do FAQ que abre.
  new ResizeObserver(onResize).observe(root);

  // Rolagem suave só depois da primeira interação (base.css): chegar por âncora ou recarregar no
  // meio da página pousa direto, sem desfilar a página.
  const enableSmoothScroll = () => {
    document.documentElement.dataset.smoothScroll = '';
  };
  window.addEventListener('pointerdown', enableSmoothScroll, { once: true, passive: true });
  window.addEventListener('keydown', enableSmoothScroll, { once: true });
}
