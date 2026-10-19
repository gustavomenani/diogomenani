/** O foco vai para o primeiro link quando a cortina do menu já cobriu a tela. */
const FOCUS_DELAY_MS = 380;
/** Mesmo ponto de quebra do CSS (Header.astro): acima dele o menu mobile não existe. */
const DESKTOP_QUERY = '(min-width: 1080px)';

export interface Menu {
  isOpen(): boolean;
}

/** Menu mobile em tela cheia: abre pelo botão, fecha com Esc, link ou ao virar desktop. */
export function initMenu(root: HTMLElement): Menu {
  const header = root.querySelector('[data-header]');
  const menu = root.querySelector<HTMLElement>('[data-menu]');
  const toggle = root.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const toggleText = root.querySelector('[data-menu-text]');
  if (!menu || !toggle) return { isOpen: () => false };

  let open = false;
  const setOpen = (next: boolean) => {
    open = next;
    root.classList.toggle('is-menu-open', next);
    toggle.setAttribute('aria-expanded', String(next));
    toggle.setAttribute('aria-label', next ? 'Fechar menu' : 'Abrir menu');
    if (toggleText) toggleText.textContent = next ? 'Fechar' : 'Menu';
    if (next) {
      menu.removeAttribute('inert');
      menu.setAttribute('aria-hidden', 'false');
      document.documentElement.style.overflow = 'hidden';
      header?.classList.remove('is-tucked');
      setTimeout(() => {
        if (open) menu.querySelector('a')?.focus({ preventScroll: true });
      }, FOCUS_DELAY_MS);
    } else {
      menu.setAttribute('inert', '');
      menu.setAttribute('aria-hidden', 'true');
      document.documentElement.style.overflow = '';
    }
  };
  setOpen(false);

  toggle.addEventListener('click', () => {
    setOpen(!open);
  });
  toggle.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      toggle.focus();
      return;
    }
    // Tab no último item volta ao botão, que fica no header, acima do menu.
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
  window.matchMedia(DESKTOP_QUERY).addEventListener('change', (event) => {
    if (event.matches && open) setOpen(false);
  });

  return { isOpen: () => open };
}
