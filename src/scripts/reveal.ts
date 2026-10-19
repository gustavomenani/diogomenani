import type { MotionMode } from './motion-mode';

/** Itens de uma lista entram escalonados: 90 ms entre cada um, até 540 ms. */
const STAGGER_STEP_MS = 90;
const STAGGER_MAX_MS = 540;
/** Depois de revelado, o item perde o atraso para não atrasar as transições de hover. */
const STAGGER_CLEANUP_MS = 1500;

type Revealable = HTMLElement | SVGElement;

const isRevealable = (node: Element): node is Revealable =>
  node instanceof HTMLElement || node instanceof SVGElement;

const isOnScreen = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
};

export interface Reveal {
  /** Mostra de uma vez tudo o que ainda falta revelar. */
  revealAll(): void;
}

/**
 * Revela [data-reveal] ao entrar na tela; fora do modo `on`, tudo aparece de uma vez. O que já
 * está na tela ao iniciar (recarregar no meio da página, por exemplo) aparece como estava: a
 * página inicia com as transições desligadas (withoutTransitions), e o mesmo vale para revealAll.
 */
export function initReveal(root: HTMLElement, getMode: () => MotionMode): Reveal {
  for (const list of root.querySelectorAll('[data-reveal-list]')) {
    [...list.children].filter(isRevealable).forEach((item, index) => {
      if (!item.hasAttribute('data-reveal')) item.setAttribute('data-reveal', 'item');
      item.style.setProperty('--d', `${Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS)}ms`);
    });
  }
  const elements = [...root.querySelectorAll('[data-reveal]')].filter(isRevealable);

  /** Revela sem esperar o atraso do escalonamento. */
  const show = (element: Revealable) => {
    element.classList.add('is-in');
    element.style.removeProperty('--d');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || !isRevealable(entry.target)) continue;
        const element = entry.target;
        element.classList.add('is-in');
        observer.unobserve(element);
        const delay = parseFloat(element.style.getPropertyValue('--d')) || 0;
        setTimeout(() => element.style.removeProperty('--d'), delay + STAGGER_CLEANUP_MS);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0 },
  );

  const revealAll = () => {
    observer.disconnect();
    for (const element of elements) show(element);
  };

  if (getMode() === 'on') {
    // Todas as medidas antes da primeira escrita: um único cálculo de layout.
    const onScreen = new Set(elements.filter(isOnScreen));
    for (const element of elements) {
      if (onScreen.has(element)) show(element);
      else observer.observe(element);
    }
  } else {
    revealAll();
  }

  return { revealAll };
}
