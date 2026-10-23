import { initBalance, TOPIC_IMPULSE } from './balance';
import { initFaq } from './faq';
import { initFocusVisibility } from './focus-visibility';
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
 * Liga o comportamento da página: revelações, foco do teclado, balança da Têmis, seletor de tema,
 * menu mobile, FAQ e efeitos de rolagem. `root` é a raiz [data-page].
 * O que a inicialização muda (modo, blocos já na tela, header, etapas) aparece direto no estado
 * certo, sem animar. No fim, ainda sem transições, a raiz ganha data-ready: ele liga os estados
 * escondidos das revelações (motion.css), e o que ficou fora da tela some sem animar. Sem ele, o
 * script inline do Base.astro devolve a página ao modo sem script.
 */
export function initPage(root: HTMLElement): void {
  withoutTransitions(root, () => {
    startPage(root);
    root.dataset.ready = '';
  });
}

/**
 * Marca o fim da entrada (data-entered) quando as animações de entrada do Header, do Hero e do
 * seletor de tema terminam: depois disso, trocar a preferência de movimento não pode reiniciá-las
 * (mudar o animation-name cria uma animação nova), e elas valem só até a marca. Espera o fim de
 * cada uma, e não um tempo fixo: numa aba aberta em segundo plano, elas só começam quando a aba
 * aparece. As canceladas por uma troca no meio da entrada também contam (allSettled).
 */
function markEntranceEnd(root: HTMLElement): void {
  const entrance = document
    .getAnimations()
    .filter(
      (animation) =>
        animation instanceof CSSAnimation && animation.effect?.getTiming().iterations !== Infinity,
    );
  void Promise.allSettled(entrance.map((animation) => animation.finished)).then(() => {
    root.dataset.entered = '';
  });
}

function startPage(root: HTMLElement): void {
  let mode: MotionMode = detectMotionMode();
  const getMode = () => mode;
  root.dataset.motion = mode;
  tryInit('fim da entrada', () => {
    markEntranceEnd(root);
  });

  // Revelação e FAQ têm estados escondidos no CSS: se um deles falhar, a página volta ao modo sem
  // script, em que tudo aparece. Nesse modo o FAQ não inicia e fica como no HTML, todo aberto.
  const reveal = attempt('revelação', () => initReveal(root, getMode), null);
  const fallback =
    reveal === null ||
    !tryInit('FAQ', () => {
      initFaq(root);
    });
  if (fallback) root.dataset.motion = 'pending';

  tryInit('foco', () => {
    initFocusVisibility(root, reveal);
  });
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
  const scroll = attempt(
    'efeitos de rolagem',
    () => initScrollEffects(root, { getMode, isMenuOpen: () => menu.isOpen() }),
    null,
  );

  // Ao recarregar no meio da página, o navegador pode devolver a rolagem só depois deste início
  // (o WebKit o faz perto do load). Até lá, a página toda fica como estava na posição que a
  // rolagem trouxer, sem animar: os blocos na tela, as etapas, as palavras do manifesto, o link
  // ativo e o header, que também não recolhe (o salto do topo até ali não é o visitante descendo).
  if (document.readyState !== 'complete') {
    /** Posição que a página já mostra como estava (a do início, ou a da última restauração). */
    let restoredY = window.scrollY;
    const restore = () => {
      restoredY = window.scrollY;
      withoutTransitions(root, () => {
        if (!fallback && mode === 'on') reveal.revealOnScreen();
        scroll?.restore();
      });
    };
    // A rolagem do próprio visitante não é a volta do recarregar: a primeira ação dele (os mesmos
    // eventos que soltam a trava do header em scroll-effects.ts) fecha a janela, e o que vier
    // depois anima e recolhe o header como no resto da visita. Sem isso, numa rede lenta, quem
    // rolava antes do load via tudo surgir sem animar e o header nunca recolher, e cada evento de
    // rolagem desligava as transições da página inteira. O navegador não devolve a rolagem depois
    // que o visitante rolou. O signal tira de uma vez a escuta de rolagem e as de entrada.
    const restoring = new AbortController();
    const close = () => {
      restoring.abort();
    };
    window.addEventListener('scroll', restore, { passive: true, signal: restoring.signal });
    for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
      window.addEventListener(type, close, { once: true, passive: true, signal: restoring.signal });
    }
    // A escuta sai um quadro depois do load: o WebKit pode devolver a rolagem no mesmo task do
    // load, depois dos listeners. Sem rolagem nova, o quadro do load não desliga as transições da
    // página, o que cortaria as que estiverem em andamento (um hover, uma resposta do FAQ).
    window.addEventListener(
      'load',
      () => {
        requestAnimationFrame(() => {
          if (!restoring.signal.aborted && window.scrollY !== restoredY) restore();
          close();
        });
      },
      { once: true },
    );
  }

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
