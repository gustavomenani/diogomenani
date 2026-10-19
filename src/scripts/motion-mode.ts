/**
 * Modo de movimento da página, gravado em data-motion na raiz:
 * - `on`: animações e revelações na rolagem;
 * - `static`: a página praticamente não rola (ex.: captura da página inteira), então tudo já
 *   aparece pronto;
 * - `reduced`: o visitante pediu menos movimento.
 * Antes do script (ou sem JavaScript), a raiz fica com `pending` e todo o conteúdo aparece.
 */
export type MotionMode = 'on' | 'static' | 'reduced';

/** A página rola menos de meia tela além da altura da janela. */
export function isStaticPage(): boolean {
  return document.documentElement.scrollHeight - window.innerHeight < window.innerHeight * 0.5;
}

export function detectMotionMode(): MotionMode {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'reduced';
  return isStaticPage() ? 'static' : 'on';
}
