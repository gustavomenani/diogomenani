import { initBalance, TOPIC_IMPULSE } from './balance';
import { initContactForm } from './contact-form';
import { initFaq } from './faq';
import { initMenu } from './menu';
import { detectMotionMode, isStaticPage, type MotionMode } from './motion-mode';
import { initReveal } from './reveal';
import { initScrollEffects } from './scroll-effects';
import { initTopicPicker } from './topic-picker';

/**
 * Liga o comportamento da página: revelações, balança da Têmis, seletor de tema, menu mobile,
 * FAQ, formulário de contato e efeitos de rolagem. `root` é a raiz [data-page].
 */
export function initPage(root: HTMLElement): void {
  let mode: MotionMode = detectMotionMode();
  root.dataset.motion = mode;

  initReveal(root, mode);
  const balance = initBalance(root, () => mode);
  initTopicPicker(root, {
    getMode: () => mode,
    onPick: () => {
      balance?.swing((Math.random() < 0.5 ? -1 : 1) * TOPIC_IMPULSE);
    },
  });
  const menu = initMenu(root);
  initFaq(root);
  initContactForm(root);
  const scroll = initScrollEffects(root, { getMode: () => mode, isMenuOpen: () => menu.isOpen() });

  // Uma página que nasceu "estática" (sem rolagem) passa a animar se a janela encolher.
  const onResize = () => {
    if (mode === 'static' && !isStaticPage()) {
      mode = 'on';
      root.dataset.motion = mode;
    }
    scroll.refresh();
  };
  window.addEventListener('resize', onResize, { passive: true });
  void document.fonts.ready.then(onResize);
}
