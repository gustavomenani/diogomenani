// Decisões ligadas à rolagem, sem DOM: recebem medidas e devolvem o estado a aplicar.
import type { MotionMode } from './motion-mode';

/** Rolagem (px) a partir da qual o header ganha fundo. */
const SCROLLED_AFTER = 24;
/** Distância (px) acumulada numa direção que conta como intenção de subir ou descer. */
const SCROLL_INTENT = 4;
/** Frações da altura do hero. */
const TUCK_AFTER_HERO = 0.85;
const FAB_AFTER_HERO = 0.75;
/** Frações da altura da tela. */
const ACTIVE_SECTION_LINE = 0.4;
const STEP_LINE = 0.7;
const STATEMENT_START = 0.9;
const STATEMENT_EXTRA = 0.32;
/**
 * Margem de baixo da revelação na rolagem (reveal.ts), em fração da altura da tela: um bloco só
 * começa a aparecer quando o topo dele passa de 92% da tela.
 */
export const REVEAL_BOTTOM_MARGIN = 0.08;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function isScrolled(y: number): boolean {
  return y > SCROLLED_AFTER;
}

/** Índice da seção ativa: a última cujo topo já passou da linha a 40% da tela (−1: nenhuma). */
export function activeSectionIndex(tops: readonly number[], viewportHeight: number): number {
  let active = -1;
  tops.forEach((top, index) => {
    if (top <= viewportHeight * ACTIVE_SECTION_LINE) active = index;
  });
  return active;
}

/**
 * Quantas etapas estão acesas. Elas ficam uma abaixo da outra (linha do tempo vertical em todas
 * as larguras): acende cada etapa que passou de 70% da tela.
 */
export function activeStepCount(tops: readonly number[], viewportHeight: number): number {
  return tops.filter((top) => top < viewportHeight * STEP_LINE).length;
}

/** Quantas palavras do manifesto estão acesas enquanto a frase atravessa a tela. */
export function litWordCount(input: {
  top: number;
  height: number;
  viewportHeight: number;
  words: number;
}): number {
  const { top, height, viewportHeight, words } = input;
  const progress = clamp(
    (viewportHeight * STATEMENT_START - top) / (height + viewportHeight * STATEMENT_EXTRA),
    0,
    1,
  );
  return Math.round(progress * words);
}

/**
 * Se o header fica recolhido: recolhe ao descer depois do hero e reaparece ao subir, pela
 * distância acumulada na direção atual (que zera quando a direção muda), não pela de cada
 * quadro. Com o foco visível (do teclado) dentro dele, nunca recolhe: o item focado não pode
 * sumir da tela. O foco que um clique ou toque deixa num botão não conta. A rolagem que um link
 * interno dispara também não conta como descer: o header fica à mostra até o visitante rolar por
 * conta própria. Numa página estática nunca recolhe; com movimento reduzido recolhe, sem deslizar
 * (Header.astro).
 */
export function nextTuck(input: {
  y: number;
  lastY: number;
  /** Distância acumulada na direção atual até a leitura anterior (positiva ao descer). */
  travel: number;
  heroHeight: number;
  mode: MotionMode;
  menuOpen: boolean;
  headerHasVisibleFocus: boolean;
  /** A rolagem vem de um link interno (âncora), e não do visitante. */
  hold: boolean;
  tucked: boolean;
}): { tucked: boolean; travel: number } {
  const { y, lastY, heroHeight, mode, menuOpen, headerHasVisibleFocus, hold, tucked } = input;
  const delta = y - lastY;
  const travel =
    delta === 0 || Math.sign(delta) === Math.sign(input.travel) ? input.travel + delta : delta;
  if (hold || headerHasVisibleFocus || mode === 'static' || y <= heroHeight * TUCK_AFTER_HERO) {
    return { tucked: false, travel };
  }
  if (travel > SCROLL_INTENT && !menuOpen) return { tucked: true, travel };
  if (travel < -SCROLL_INTENT) return { tucked: false, travel };
  return { tucked, travel };
}

/**
 * O botão flutuante aparece depois do hero, ou assim que o botão principal do hero passa por
 * baixo do header (sem isso, ficava uma faixa da rolagem sem nenhum botão do WhatsApp na tela), e
 * some perto do contato e do rodapé. No contato, pelo mesmo motivo, ele só some quando o botão do
 * contato já está inteiro na tela: medido pelo topo da seção, sumia com o botão do contato ainda
 * abaixo do título e do texto de abertura, e no celular e no tablet sobravam de 130 a 300 px de
 * rolagem sem nenhum dos dois. Com movimento, também espera o bloco desse botão passar da linha
 * de revelação (REVEAL_BOTTOM_MARGIN): antes dela, o botão do contato está na tela, mas invisível,
 * e sobravam de 12 a 52 px (8% da tela menos a altura do bloco) sem nenhum dos dois.
 */
export function isFabVisible(input: {
  mode: MotionMode;
  y: number;
  heroHeight: number;
  viewportHeight: number;
  /** Base do botão principal do hero na tela; `null` sem o botão. */
  heroCtaBottom: number | null;
  /** Base do header na tela (perto de 0 com ele recolhido). */
  headerBottom: number;
  /**
   * Base do botão do contato na tela (sem o botão, o topo da seção), topo do bloco revelado que o
   * envolve (sem o bloco, o do botão; sem o botão, o topo da seção) e base da seção; `null` sem a
   * seção.
   */
  contact: { ctaBottom: number; ctaTop: number; bottom: number } | null;
  footerTop: number | null;
}): boolean {
  const { mode, y, heroHeight, viewportHeight, heroCtaBottom, headerBottom, contact, footerTop } =
    input;
  const pastHero =
    y > heroHeight * FAB_AFTER_HERO || (heroCtaBottom !== null && heroCtaBottom < headerBottom);
  const ctaShown =
    contact !== null &&
    (mode !== 'on' || contact.ctaTop < viewportHeight * (1 - REVEAL_BOTTOM_MARGIN));
  const nearContact =
    contact !== null && ctaShown && contact.ctaBottom < viewportHeight && contact.bottom > 0;
  const nearFooter = footerTop !== null && footerTop < viewportHeight;
  return mode !== 'static' && pastHero && !(nearContact || nearFooter);
}
