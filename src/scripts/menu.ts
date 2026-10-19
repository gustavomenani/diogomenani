/** O foco vai para o primeiro link quando a cortina do menu já cobriu a tela. */
const FOCUS_DELAY_MS = 380;
/** Mesmo ponto de quebra do CSS (Header.astro): acima dele o menu mobile não existe. */
const DESKTOP_QUERY = '(min-width: 1080px)';

export interface Menu {
  isOpen(): boolean;
}

/**
 * Menu mobile em tela cheia: abre pelo botão e fecha pelo botão, com Esc (de qualquer ponto da
 * página), num link, ao voltar no histórico ou ao virar desktop, com o foco no lugar certo.
 * Fechado, ele fica `inert`; aberto, o resto da página (tudo menos o header) fica `inert`.
 */
export function initMenu(root: HTMLElement): Menu {
  const header = root.querySelector('[data-header]');
  const menu = root.querySelector<HTMLElement>('[data-menu]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  if (!menu || !toggle) return { isOpen: () => false };
  const toggleText = toggle.querySelector('[data-menu-text]');
  const background = [...root.children].filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== header && element !== menu,
  );

  let open = false;

  // No Safari o clique não foca o botão, e um clique no fundo do menu tira o foco dos links: o
  // Esc é ouvido na página inteira enquanto o menu está aberto.
  const onEscape = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    setOpen(false);
    toggle.focus();
  };

  const setOpen = (next: boolean) => {
    open = next;
    root.classList.toggle('is-menu-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    if (toggleText) toggleText.textContent = next ? 'Fechar' : 'Menu';
    menu.inert = !next;
    for (const element of background) element.inert = next;
    const html = document.documentElement;
    if (next) {
      document.addEventListener('keydown', onEscape);
      // Com barra de rolagem clássica, travar a rolagem a tiraria e o header andaria para o lado:
      // o espaço dela fica reservado. Barras sobrepostas (celular, macOS) não ocupam espaço.
      if (window.innerWidth > html.clientWidth) html.style.scrollbarGutter = 'stable';
      html.style.overflow = 'hidden';
      header?.classList.remove('is-tucked');
      setTimeout(() => {
        if (open) menu.querySelector('a')?.focus({ preventScroll: true });
      }, FOCUS_DELAY_MS);
    } else {
      document.removeEventListener('keydown', onEscape);
      html.style.overflow = '';
      html.style.scrollbarGutter = '';
    }
  };
  setOpen(false);

  /** Fecha o menu; se o foco estava nele, que fica inerte, o foco volta ao botão. */
  const close = () => {
    const hadFocus = menu.contains(document.activeElement);
    setOpen(false);
    if (hadFocus) toggle.focus();
  };

  toggle.addEventListener('click', () => {
    setOpen(!open);
  });
  // Tab no último item volta ao botão, que fica no header, acima do menu.
  menu.addEventListener('keydown', (event) => {
    const links = menu.querySelectorAll('a');
    if (
      event.key === 'Tab' &&
      !event.shiftKey &&
      document.activeElement === links[links.length - 1]
    ) {
      event.preventDefault();
      toggle.focus();
    }
  });
  // Qualquer link ativado com o menu aberto o fecha: os do menu e a marca no header.
  root.addEventListener('click', (event) => {
    if (open && event.target instanceof Element && event.target.closest('a')) setOpen(false);
  });
  // Voltar no histórico (o botão Voltar do Android, por exemplo) fecha o menu.
  for (const type of ['popstate', 'hashchange']) {
    window.addEventListener(type, () => {
      if (open) close();
    });
  }
  // No desktop o botão e o menu somem: o foco que estava neles vai para o link do header com o
  // mesmo destino (ou para o primeiro da navegação).
  window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
    if (!event.matches || !open) return;
    const focused = document.activeElement;
    const hadFocus = focused === toggle || menu.contains(focused);
    setOpen(false);
    if (!hadFocus || !header) return;
    const href = focused?.getAttribute('href');
    const links = [...header.querySelectorAll('a')];
    const target =
      links.find((link) => href != null && link.getAttribute('href') === href) ??
      header.querySelector<HTMLElement>('[data-nav] a');
    target?.focus();
  });

  return { isOpen: () => open };
}
