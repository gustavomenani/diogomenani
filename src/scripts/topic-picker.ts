import type { MotionMode } from './motion-mode';

const EASE_OUT_EXPO = 'cubic-bezier(.16,1,.3,1)';

interface TopicPickerOptions {
  getMode: () => MotionMode;
  /** Chamado a cada tema escolhido, depois de o botão principal mudar. */
  onPick: () => void;
}

/**
 * Seletor de tema do hero: escolher um tema troca o link e o rótulo do botão principal do
 * WhatsApp (data-href e data-cta de cada opção).
 */
export function initTopicPicker(root: HTMLElement, { getMode, onPick }: TopicPickerOptions): void {
  const picker = root.querySelector('[data-topic]');
  const cta = root.querySelector<HTMLAnchorElement>('[data-wa-cta]');
  // O rótulo é procurado dentro do botão: outros botões do WhatsApp têm o mesmo hook.
  const label = cta?.querySelector<HTMLElement>('[data-wa-label]');
  if (!picker || !cta || !label) return;

  /** Animações da troca em andamento; a troca seguinte as cancela antes de começar. */
  let running: Animation[] = [];

  /** Troca o rótulo: o antigo sai para cima, o novo entra por baixo e o botão ajusta a largura. */
  const swapLabel = (text: string) => {
    // Cancelar também impede o onfinish da troca anterior de gravar um rótulo velho.
    for (const animation of running) animation.cancel();
    running = [];
    if (getMode() === 'reduced') {
      label.textContent = text;
      return;
    }
    const startWidth = cta.getBoundingClientRect().width;
    const leave = label.animate(
      [
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: 'translateY(-45%)' },
      ],
      { duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
    );
    running = [leave];
    leave.onfinish = () => {
      label.textContent = text;
      const endWidth = cta.getBoundingClientRect().width;
      leave.cancel();
      running = [
        label.animate(
          [
            { opacity: 0, transform: 'translateY(45%)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: 460, easing: EASE_OUT_EXPO },
        ),
        cta.animate([{ width: `${startWidth}px` }, { width: `${endWidth}px` }], {
          duration: 520,
          easing: EASE_OUT_EXPO,
        }),
      ];
    };
  };

  picker.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const { href, cta: text } = input.dataset;
    if (!href || !text) return;
    cta.href = href;
    swapLabel(text);
    onPick();
  });
}
