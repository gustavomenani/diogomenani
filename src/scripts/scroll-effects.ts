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

/** Topo de layout em relação ao documento: ignora transforms, como o da entrada animada. */
function layoutTop(element: Element): number {
  let top = 0;
  for (let node: Element | null = element; node instanceof HTMLElement; node = node.offsetParent) {
    top += node.offsetTop;
  }
  return top;
}

/**
 * A folga das rolagens (scroll-padding-top, em base.css) acompanha a altura real do header pela
 * variável --header-live: com o espaçamento de texto do visitante (WCAG 1.4.12), entre 1080 e
 * 1279 px a linha do header quebra e ele passa dos 84 px do token, e o foco e as âncoras parariam
 * embaixo dele (2.4.11). Até a altura do token nada é gravado, porque a folga já é essa: uma
 * variável na raiz recalcula o estilo da página inteira, e a altura muda a cada quadro da
 * transição do header ao rolar.
 */
function followHeaderHeight(header: HTMLElement): void {
  const html = document.documentElement;
  const token = Number.parseFloat(getComputedStyle(html).getPropertyValue('--header-h')) || 0;
  let live = '';
  new ResizeObserver(() => {
    const height = header.offsetHeight;
    const next = height > token ? `${height}px` : '';
    if (next === live) return;
    live = next;
    if (next) html.style.setProperty('--header-live', next);
    else html.style.removeProperty('--header-live');
  }).observe(header);
}

interface ScrollEffectsOptions {
  getMode: () => MotionMode;
  isMenuOpen: () => boolean;
}

export interface ScrollEffects {
  /** Remede o que depende do tamanho da janela e recalcula no próximo quadro. */
  refresh(): void;
  /** Recalcula tudo na hora, depois de o modo mudar; fora do modo `on`, o parallax zera. */
  reset(): void;
  /**
   * Parte da posição atual como se a página tivesse aberto nela e recalcula tudo na hora: a
   * rolagem que o navegador devolve ao recarregar não conta como descida (não recolhe o header).
   */
  restore(): void;
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
  /** Elemento HTML pelo seletor; nada se faltar (ou se não for HTML). */
  const htmlElement = (selector: string) => {
    const element = root.querySelector(selector);
    return element instanceof HTMLElement ? element : null;
  };
  const header = htmlElement('[data-header]');
  const progress = htmlElement('[data-progress]');
  const figure = htmlElement('[data-figure]');
  const glow = htmlElement('[data-glow]');
  const hero = htmlElement('[data-hero]');
  const heroCta = root.querySelector('[data-wa-cta]');
  const fab = root.querySelector('[data-fab]');
  const contact = root.querySelector(`#${sectionIds.contact}`);
  /** Botão do WhatsApp do contato: o flutuante só some quando ele está inteiro na tela. */
  const contactCta = contact?.querySelector('[data-contact-cta]') ?? null;
  /** O bloco revelado que envolve esse botão: antes da linha de revelação, ele está invisível. */
  const contactCtaBlock = contactCta?.closest('[data-reveal]') ?? contactCta;
  const footer = root.querySelector('[data-footer]');
  const nav = root.querySelector('[data-nav]');
  const indicator = htmlElement('[data-nav-ind]');
  const navLinks = [...root.querySelectorAll('[data-nav] a[href^="#"]')];
  /** Cada link da navegação com a seção que ele aponta, achada pelo id (sem seletor CSS). */
  const targets = navLinks.flatMap((link) => {
    const section = document.getElementById(link.getAttribute('href')?.slice(1) ?? '');
    return section ? [{ link, section }] : [];
  });
  const steps = [...root.querySelectorAll('[data-step]')];
  const statement = root.querySelector('[data-statement]');
  const words = statement ? [...statement.children] : [];

  let heroHeight = hero?.offsetHeight ?? 0;
  /** Etapas pela posição de layout: durante a entrada animada, cada uma está deslocada. */
  let stepOffsets = steps.map(layoutTop);
  let lastY = window.scrollY;
  /** Distância acumulada na direção atual da rolagem (nextTuck). */
  let travel = 0;
  /** Seção ativa já aplicada; `undefined` força reaplicar no próximo quadro. */
  let activeId: string | null | undefined = null;
  let litWords = -1;
  let ticking = false;
  /** A rolagem em curso veio de um link interno (nextTuck): o header não recolhe. */
  let hold = false;

  const update = () => {
    ticking = false;
    const mode = getMode();
    const motionOn = mode === 'on';

    // Leitura.
    const y = window.scrollY;
    const viewportHeight = window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - viewportHeight);
    const sectionTops =
      mode === 'static' ? [] : targets.map(({ section }) => section.getBoundingClientRect().top);
    const active = targets[activeSectionIndex(sectionTops, viewportHeight)];
    const id = active?.section.id ?? null;
    const activeChanged = id !== activeId;
    const activeLink = activeChanged ? active?.link : undefined;
    const navRect = activeLink && nav ? nav.getBoundingClientRect() : null;
    const linkRect = navRect ? activeLink?.getBoundingClientRect() : undefined;
    const contactRect = fab && contact ? contact.getBoundingClientRect() : null;
    const contactCtaBottom =
      contactRect && contactCta ? contactCta.getBoundingClientRect().bottom : null;
    const contactCtaTop =
      contactRect && contactCtaBlock ? contactCtaBlock.getBoundingClientRect().top : null;
    const footerTop = fab && footer ? footer.getBoundingClientRect().top : null;
    const heroCtaBottom = fab && heroCta ? heroCta.getBoundingClientRect().bottom : null;
    const headerBottom = fab && header ? header.getBoundingClientRect().bottom : 0;
    const stepTops = motionOn ? stepOffsets.map((top) => top - y) : [];
    const statementRect = motionOn && statement ? statement.getBoundingClientRect() : null;

    // Escrita.
    if (header) {
      header.classList.toggle('is-scrolled', isScrolled(y));
      const tuck = nextTuck({
        y,
        lastY,
        travel,
        heroHeight,
        mode,
        menuOpen: isMenuOpen(),
        headerHasVisibleFocus: header.querySelector(':focus-visible') !== null,
        hold,
        tucked: header.classList.contains('is-tucked'),
      });
      travel = tuck.travel;
      header.classList.toggle('is-tucked', tuck.tucked);
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
          // Escondido, o indicador aparece já no link novo, sem deslizar desde onde sumiu (ou
          // desde a borda da navegação, na primeira vez): o traço cruzava a navegação inteira
          // enquanto acendia. Entre dois links visíveis, ele continua deslizando.
          const appearing = indicator.style.opacity !== '1';
          if (appearing) indicator.style.transition = 'opacity 0.4s';
          indicator.style.opacity = '1';
          indicator.style.transform = `translateX(${(linkRect.left - navRect.left).toFixed(1)}px) scaleX(${linkRect.width.toFixed(1)})`;
          if (appearing) {
            // Exceção à leitura antes da escrita, só quando ele reaparece: ler o layout aplica a
            // posição nova ainda sem a transição do transform, que volta no quadro seguinte (o
            // mesmo do showNow de reveal.ts).
            indicator.getBoundingClientRect();
            requestAnimationFrame(() => indicator.style.removeProperty('transition'));
          }
        } else {
          indicator.style.opacity = '0';
        }
      }
    }

    if (fab) {
      fab.classList.toggle(
        'is-visible',
        isFabVisible({
          mode,
          y,
          heroHeight,
          viewportHeight,
          heroCtaBottom,
          headerBottom,
          contact: contactRect && {
            ctaBottom: contactCtaBottom ?? contactRect.top,
            ctaTop: contactCtaTop ?? contactRect.top,
            bottom: contactRect.bottom,
          },
          footerTop,
        }),
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
        words.forEach((word, index) => word.classList.toggle('is-lit', index < lit));
      }
    }
  };

  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };

  window.addEventListener('scroll', schedule, { passive: true });
  // O foco do teclado entrando no header recolhido (ex.: Tab depois do fim da página) o traz de volta.
  header?.addEventListener('focusin', () => {
    header.classList.remove('is-tucked');
  });
  // Um link interno (navegação, menu, hero, rodapé) ou a volta no histórico entre âncoras rola
  // até a seção sem ser o visitante descendo: recolhido no caminho, o header sumia justo depois
  // da escolha, e a folga de 84 px (scroll-padding-top) mostrava uma faixa da seção anterior.
  const holdHeader = () => {
    hold = true;
    header?.classList.remove('is-tucked');
  };
  root.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a[href^="#"]')) holdHeader();
  });
  window.addEventListener('hashchange', holdHeader);
  // A primeira rolagem do próprio visitante solta a trava. O pointerdown cobre o arraste da barra
  // de rolagem; no clique num link, ele chega antes do click, que liga a trava de novo.
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(
      type,
      () => {
        hold = false;
      },
      { passive: true },
    );
  }
  if (header) followHeaderHeight(header);
  update();

  return {
    refresh() {
      heroHeight = hero?.offsetHeight ?? 0;
      stepOffsets = steps.map(layoutTop);
      activeId = undefined;
      schedule();
    },
    reset() {
      if (getMode() !== 'on') {
        if (figure) figure.style.transform = '';
        if (glow) glow.style.transform = '';
      }
      activeId = undefined;
      litWords = -1;
      update();
    },
    restore() {
      lastY = window.scrollY;
      travel = 0;
      activeId = undefined;
      litWords = -1;
      update();
    },
  };
}
