import { sectionIds } from '../data/navigation';
import type { MotionMode } from './motion-mode';
import {
  activeSectionIndex,
  activeStepCount,
  isFabVisible,
  isScrolled,
  litWordCount,
  nextTuck,
} from './scroll-math';

/** Parallax do hero: só enquanto ele está por perto (fração da altura do hero). */
const PARALLAX_UNTIL_HERO = 1.2;
const PARALLAX_FIGURE = 0.16;
const PARALLAX_GLOW = 0.32;

interface ScrollEffectsOptions {
  getMode: () => MotionMode;
  isMenuOpen: () => boolean;
}

export interface ScrollEffects {
  /** Remede o que depende do tamanho da janela e recalcula no próximo quadro. */
  refresh(): void;
}

/**
 * Estado ligado à rolagem: header (fundo e recolhimento), barra de progresso, parallax do hero,
 * link ativo da navegação, etapas do atendimento, palavras do manifesto e botão flutuante.
 * A cada quadro, toda a geometria é lida antes de qualquer escrita no DOM.
 */
export function initScrollEffects(
  root: HTMLElement,
  { getMode, isMenuOpen }: ScrollEffectsOptions,
): ScrollEffects {
  const header = root.querySelector('[data-header]');
  const progress = root.querySelector<HTMLElement>('[data-progress]');
  const figure = root.querySelector<HTMLElement>('[data-figure]');
  const glow = root.querySelector<HTMLElement>('[data-glow]');
  const hero = root.querySelector<HTMLElement>('[data-hero]');
  const fab = root.querySelector('[data-fab]');
  const contact = root.querySelector(`#${sectionIds.contact}`);
  const footer = root.querySelector('[data-footer]');
  const nav = root.querySelector('[data-nav]');
  const indicator = root.querySelector<HTMLElement>('[data-nav-ind]');
  const navLinks = [...root.querySelectorAll<HTMLAnchorElement>('[data-nav] a[href^="#"]')];
  const sections = navLinks
    .map((link) => (link.hash ? root.querySelector<HTMLElement>(link.hash) : null))
    .filter((section) => section !== null);
  const steps = [...root.querySelectorAll('[data-step]')];
  const statement = root.querySelector('[data-statement]');
  const words = statement ? [...statement.children] : [];

  let heroHeight = hero?.offsetHeight ?? 0;
  let lastY = window.scrollY;
  /** Seção ativa já aplicada; `undefined` força reaplicar no próximo quadro. */
  let activeId: string | null | undefined = null;
  let litWords = -1;
  let ticking = false;

  const update = () => {
    ticking = false;
    const mode = getMode();
    const motionOn = mode === 'on';

    // Leitura.
    const y = window.scrollY;
    const viewportHeight = window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const sectionTops =
      mode === 'static' ? [] : sections.map((section) => section.getBoundingClientRect().top);
    const id = sections[activeSectionIndex(sectionTops, viewportHeight)]?.id ?? null;
    const activeChanged = id !== activeId;
    const activeLink = activeChanged
      ? navLinks.find((link) => link.hash === `#${String(id)}`)
      : undefined;
    const navRect = activeLink && nav ? nav.getBoundingClientRect() : null;
    const linkRect = navRect ? activeLink?.getBoundingClientRect() : undefined;
    const contactRect = fab && contact ? contact.getBoundingClientRect() : null;
    const footerTop = fab && footer ? footer.getBoundingClientRect().top : null;
    const stepTops = motionOn ? steps.map((step) => step.getBoundingClientRect().top) : [];
    const statementRect = motionOn && statement ? statement.getBoundingClientRect() : null;

    // Escrita.
    if (header) {
      header.classList.toggle('is-scrolled', isScrolled(y));
      header.classList.toggle(
        'is-tucked',
        nextTuck({
          y,
          lastY,
          heroHeight,
          motionOn,
          menuOpen: isMenuOpen(),
          tucked: header.classList.contains('is-tucked'),
        }),
      );
    }
    lastY = y;

    if (progress) progress.style.transform = `scaleX(${(y / maxScroll).toFixed(4)})`;
    if (motionOn && y < heroHeight * PARALLAX_UNTIL_HERO) {
      if (figure) figure.style.transform = `translate3d(0,${(y * PARALLAX_FIGURE).toFixed(1)}px,0)`;
      if (glow) glow.style.transform = `translate3d(0,${(y * PARALLAX_GLOW).toFixed(1)}px,0)`;
    }

    if (activeChanged) {
      activeId = id;
      for (const link of navLinks) {
        const on = link === activeLink;
        link.classList.toggle('is-active', on);
        if (on) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      }
      // O indicador tem 1 px de largura e é esticado até a largura do link ativo.
      if (indicator && nav) {
        if (navRect && linkRect) {
          indicator.style.opacity = '1';
          indicator.style.transform = `translateX(${(linkRect.left - navRect.left).toFixed(1)}px) scaleX(${linkRect.width.toFixed(1)})`;
        } else {
          indicator.style.opacity = '0';
        }
      }
    }

    if (fab) {
      fab.classList.toggle(
        'is-visible',
        isFabVisible({ mode, y, heroHeight, viewportHeight, contact: contactRect, footerTop }),
      );
    }

    if (stepTops.length) {
      const active = activeStepCount(stepTops, viewportHeight);
      steps.forEach((step, index) => {
        step.classList.toggle('is-active', index < active);
        step.classList.toggle('is-done', index < active - 1);
      });
    }

    if (statementRect) {
      const lit = litWordCount({
        top: statementRect.top,
        height: statementRect.height,
        viewportHeight,
        words: words.length,
      });
      if (lit !== litWords) {
        litWords = lit;
        words.forEach((word, index) => word.classList.toggle('lit', index < lit));
      }
    }
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  update();

  return {
    refresh() {
      heroHeight = hero?.offsetHeight ?? 0;
      activeId = undefined;
      schedule();
    },
  };
}
