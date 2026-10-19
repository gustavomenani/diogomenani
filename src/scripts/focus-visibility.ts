import type { Reveal } from './reveal';

/** Dentro de um elemento fixo (header, menu, botão flutuante), rolar a página não o move. */
function isInFixedLayer(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (getComputedStyle(node).position === 'fixed') return true;
  }
  return false;
}

/**
 * Foco do teclado sempre à vista: entrar num bloco que ainda não apareceu o mostra na hora, e a
 * página rola o mínimo para o item focado não ficar sob o header nem sob o botão flutuante (as
 * folgas são o scroll-padding de base.css; sozinho, o Firefox rola menos que isso). O foco que um
 * clique ou toque deixa num botão não conta.
 */
export function initFocusVisibility(root: HTMLElement, reveal: Reveal | null): void {
  root.addEventListener('focusin', (event) => {
    const { target } = event;
    if (!(target instanceof Element) || !target.matches(':focus-visible')) return;
    // Primeiro revela: o bloco escondido está deslocado, e a rolagem mede a posição final.
    reveal?.revealAround(target);
    if (!isInFixedLayer(target)) target.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  });
}
