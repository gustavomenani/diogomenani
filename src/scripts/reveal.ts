import type { MotionMode } from './motion-mode';
import { REVEAL_BOTTOM_MARGIN } from './scroll-math';

/**
 * Itens de uma lista que entram juntos na tela entram escalonados: 90 ms entre cada um, até
 * 540 ms; o que entra sozinho começa na hora.
 */
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
  /** Mostra na hora, sem transição, os blocos que contêm `target` e ainda não apareceram. */
  revealAround(target: Element): void;
  /** Mostra na hora, sem transição, o que está na tela e ainda não apareceu. */
  revealOnScreen(): void;
}

/**
 * Revela [data-reveal] ao entrar na tela; fora do modo `on`, tudo aparece de uma vez. O que já
 * está na tela ao iniciar (recarregar no meio da página, por exemplo) aparece como estava: a
 * página inicia com as transições desligadas (withoutTransitions), e o mesmo vale para revealAll.
 * A rolagem que o navegador devolve depois do início passa pelo revealOnScreen (main.ts).
 */
export function initReveal(root: HTMLElement, getMode: () => MotionMode): Reveal {
  /** Itens das listas escalonadas ([data-reveal-list]). */
  const listItems = new WeakSet<Element>();
  for (const list of root.querySelectorAll('[data-reveal-list]')) {
    for (const item of [...list.children].filter(isRevealable)) {
      if (!item.hasAttribute('data-reveal')) item.setAttribute('data-reveal', 'item');
      listItems.add(item);
    }
  }
  const elements = [...root.querySelectorAll('[data-reveal]')].filter(isRevealable);

  /** Revela sem esperar o atraso do escalonamento. */
  const show = (element: Revealable) => {
    element.classList.add('is-in');
    element.style.removeProperty('--d');
  };

  const observer = new IntersectionObserver(
    (entries) => {
      // O atraso sai da ordem dentro do lote, e não da posição na lista: pelo índice, o item que
      // a rolagem traz sozinho (cada um na sua vez, no celular) esperava parado e invisível até
      // 540 ms. As entradas chegam na ordem dos observe(), que é a do documento.
      const order = new Map<Element, number>();
      for (const entry of entries) {
        if (!entry.isIntersecting || !isRevealable(entry.target)) continue;
        const element = entry.target;
        const list = element.parentElement;
        let delay = 0;
        if (list && listItems.has(element)) {
          const position = order.get(list) ?? 0;
          order.set(list, position + 1);
          delay = Math.min(position * STAGGER_STEP_MS, STAGGER_MAX_MS);
          // Gravado antes do is-in, no mesmo quadro: o atraso vale já para esta transição.
          if (delay > 0) element.style.setProperty('--d', `${delay}ms`);
        }
        element.classList.add('is-in');
        observer.unobserve(element);
        if (delay > 0) {
          setTimeout(() => element.style.removeProperty('--d'), delay + STAGGER_CLEANUP_MS);
        }
      }
    },
    { rootMargin: `0px 0px -${REVEAL_BOTTOM_MARGIN * 100}% 0px`, threshold: 0 },
  );

  /**
   * Mostra na hora, sem transição: ler o layout aplica o estado revelado ainda sem ela, e a
   * transição volta no quadro seguinte.
   */
  const showNow = (list: Revealable[]) => {
    for (const element of list) {
      observer.unobserve(element);
      element.style.transition = 'none';
      show(element);
    }
    list[0]?.getBoundingClientRect();
    requestAnimationFrame(() => {
      for (const element of list) element.style.removeProperty('transition');
    });
  };

  const revealAll = () => {
    observer.disconnect();
    for (const element of elements) show(element);
  };

  const revealAround = (target: Element) => {
    // Escondidos ou ainda no meio da entrada (com o atraso do escalonamento, por exemplo).
    const unfinished = elements.filter(
      (element) =>
        element.contains(target) &&
        (!element.classList.contains('is-in') || element.getAnimations().length > 0),
    );
    if (unfinished.length === 0) return;
    showNow(unfinished);
  };

  const revealOnScreen = () => {
    const pending = elements.filter(
      (element) => !element.classList.contains('is-in') && isOnScreen(element),
    );
    if (pending.length === 0) return;
    showNow(pending);
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

  return { revealAll, revealAround, revealOnScreen };
}
