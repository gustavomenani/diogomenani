// Decisões ligadas à rolagem, sem DOM: recebem medidas e devolvem o estado a aplicar.
import type { MotionMode } from './motion-mode';

/** Rolagem (px) a partir da qual o header ganha fundo. */
const SCROLLED_AFTER = 24;
/** Mudança mínima de rolagem (px) que conta como intenção de subir ou descer. */
const SCROLL_INTENT = 4;
/** Frações da altura do hero. */
const TUCK_AFTER_HERO = 0.85;
const FAB_AFTER_HERO = 0.75;
/** Frações da altura da tela. */
const ACTIVE_SECTION_LINE = 0.4;
const STEPS_START = 0.86;
const STEPS_SPAN = 0.42;
const STACKED_STEP_LINE = 0.7;
const STATEMENT_START = 0.9;
const STATEMENT_EXTRA = 0.32;
const FAB_HIDE_CONTACT = 0.8;
/** Diferença de topo (px) abaixo da qual as etapas estão na mesma linha. */
const SAME_ROW = 4;

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
 * Quantas etapas estão acesas. Em linha (desktop), acendem uma a uma enquanto o bloco sobe de
 * 86% a 44% da tela; empilhadas (celular), acende cada etapa que passou de 70% da tela.
 */
export function activeStepCount(tops: readonly number[], viewportHeight: number): number {
  const first = tops[0];
  const last = tops[tops.length - 1];
  if (first === undefined || last === undefined) return 0;
  if (Math.abs(last - first) < SAME_ROW) {
    const progress = (viewportHeight * STEPS_START - first) / (viewportHeight * STEPS_SPAN);
    if (progress <= 0) return 0;
    return 1 + Math.floor(clamp(progress, 0, 1) * (tops.length - 1) + 1e-6);
  }
  return tops.filter((top) => top < viewportHeight * STACKED_STEP_LINE).length;
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
 * Se o header fica recolhido: recolhe ao descer depois do hero e reaparece ao subir. Com o foco
 * visível (do teclado) dentro dele, nunca recolhe: o item focado não pode sumir da tela. O foco
 * que um clique ou toque deixa num botão não conta.
 */
export function nextTuck(input: {
  y: number;
  lastY: number;
  heroHeight: number;
  motionOn: boolean;
  menuOpen: boolean;
  headerHasVisibleFocus: boolean;
  tucked: boolean;
}): boolean {
  const { y, lastY, heroHeight, motionOn, menuOpen, headerHasVisibleFocus, tucked } = input;
  if (headerHasVisibleFocus) return false;
  const pastHero = y > heroHeight * TUCK_AFTER_HERO;
  if (motionOn && !menuOpen && pastHero && y > lastY + SCROLL_INTENT) return true;
  if (y < lastY - SCROLL_INTENT || !pastHero) return false;
  return tucked;
}

/** O botão flutuante aparece depois do hero e some perto do contato e do rodapé. */
export function isFabVisible(input: {
  mode: MotionMode;
  y: number;
  heroHeight: number;
  viewportHeight: number;
  contact: { top: number; bottom: number } | null;
  footerTop: number | null;
}): boolean {
  const { mode, y, heroHeight, viewportHeight, contact, footerTop } = input;
  const nearContact =
    contact !== null && contact.top < viewportHeight * FAB_HIDE_CONTACT && contact.bottom > 0;
  const nearFooter = footerTop !== null && footerTop < viewportHeight;
  return mode !== 'static' && y > heroHeight * FAB_AFTER_HERO && !(nearContact || nearFooter);
}
