/**
 * Modo de movimento da página, gravado em data-motion na raiz:
 * - `on`: animações e revelações na rolagem;
 * - `static`: a página praticamente não rola (ex.: captura da página inteira), então tudo já
 *   aparece pronto;
 * - `reduced`: o visitante pediu menos movimento.
 * Sem script, ou se ele falhar, a raiz fica com `pending` e todo o conteúdo aparece. O script
 * inline do Base.astro escolhe entre `on` e `reduced` antes da primeira pintura; o módulo da
 * página confirma (ou passa a `static`) e acompanha a preferência.
 */
export type MotionMode = 'on' | 'static' | 'reduced';

/** O mesmo pedido que o script inline do Base.astro consulta. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** A página rola menos de meia tela além da altura da janela. */
export function isStaticPage(): boolean {
  return document.documentElement.scrollHeight - window.innerHeight < window.innerHeight * 0.5;
}

export function detectMotionMode(): MotionMode {
  if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return 'reduced';
  return isStaticPage() ? 'static' : 'on';
}

/**
 * Aplica `change` com as transições desligadas (data-instant, em motion.css): o que ele muda vai
 * direto ao estado final. As transições voltam no quadro seguinte.
 */
export function withoutTransitions(root: HTMLElement, change: () => void): void {
  root.setAttribute('data-instant', '');
  try {
    change();
  } finally {
    // Ler o layout calcula o estilo novo enquanto as transições ainda estão desligadas.
    root.getBoundingClientRect();
    requestAnimationFrame(() => {
      root.removeAttribute('data-instant');
    });
  }
}

/** Troca o modo da raiz sem animar a troca; `change` roda junto, também sem animar. */
export function setMode(root: HTMLElement, mode: MotionMode, change: () => void): void {
  withoutTransitions(root, () => {
    root.dataset.motion = mode;
    change();
  });
}
