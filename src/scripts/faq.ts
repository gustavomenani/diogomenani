/** Perguntas frequentes: cada botão abre e fecha a própria resposta, sem fechar as outras. */
export function initFaq(root: HTMLElement): void {
  for (const button of root.querySelectorAll<HTMLElement>('[data-faq-btn]')) {
    const item = button.closest('[data-faq-item]');
    if (!item) continue;
    button.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
    });
  }
}
