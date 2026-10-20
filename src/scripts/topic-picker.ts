import type { MotionMode } from './motion-mode';

/** A mesma curva de --ease (tokens.css): a Web Animations API não lê variáveis CSS. */
const EASE_OUT_EXPO = 'cubic-bezier(.16,1,.3,1)';
/** Saída do rótulo inteiro (de opacidade 1 a 0), entrada do novo e ajuste da largura do botão. */
const LEAVE_MS = 150;
const ENTER_MS = 460;
const RESIZE_MS = 520;

interface TopicPickerOptions {
  getMode: () => MotionMode;
  /** Chamado a cada tema escolhido, depois de o botão principal mudar. */
  onPick: () => void;
}

/** Link e rótulo do tema de uma opção (data-href e data-cta); nada se faltar um dos dois. */
function topicOf(input: HTMLInputElement): { href: string; text: string } | null {
  const { href, cta } = input.dataset;
  return href && cta ? { href, text: cta } : null;
}

/**
 * Seletor de tema do hero: escolher um tema troca o link e o rótulo do botão principal do
 * WhatsApp. Um tema já marcado ao iniciar (o navegador restaura o rádio ao voltar ou recarregar)
 * aparece no botão direto, sem animar e sem mexer na balança.
 */
export function initTopicPicker(root: HTMLElement, { getMode, onPick }: TopicPickerOptions): void {
  const picker = root.querySelector('[data-topic]');
  const cta = root.querySelector('[data-wa-cta]');
  if (!picker || !(cta instanceof HTMLAnchorElement)) return;
  // O rótulo é procurado dentro do botão: outros botões do WhatsApp têm o mesmo hook.
  const label = cta.querySelector('[data-wa-label]');
  if (!label) return;

  /** Animações da troca em andamento; a troca seguinte as cancela antes de começar. */
  let running: Animation[] = [];

  /**
   * Troca o rótulo: o antigo sai para cima, o novo entra por baixo e o botão ajusta a largura.
   * Uma troca no meio da anterior parte do que está na tela: da opacidade e da posição do rótulo
   * e da largura do botão naquele quadro.
   */
  const swapLabel = (text: string) => {
    const width = cta.getBoundingClientRect().width;
    const { opacity, transform } = getComputedStyle(label);
    // Cancelar também impede o onfinish da troca anterior de gravar um rótulo velho.
    for (const animation of running) animation.cancel();
    running = [];
    if (getMode() === 'reduced') {
      label.textContent = text;
      return;
    }
    const from = Number(opacity);
    const leaveMs = LEAVE_MS * from;
    const leave = label.animate(
      [
        { opacity: from, transform },
        { opacity: 0, transform: 'translateY(-45%)' },
      ],
      { duration: leaveMs, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
    );
    // Enquanto o rótulo sai, o botão fica com a largura que tinha.
    const hold = cta.animate([{ width: `${width}px` }, { width: `${width}px` }], {
      duration: leaveMs,
      fill: 'forwards',
    });
    running = [leave, hold];
    leave.onfinish = () => {
      label.textContent = text;
      hold.cancel();
      const endWidth = cta.getBoundingClientRect().width;
      leave.cancel();
      running = [
        label.animate(
          [
            { opacity: 0, transform: 'translateY(45%)' },
            { opacity: 1, transform: 'none' },
          ],
          { duration: ENTER_MS, easing: EASE_OUT_EXPO },
        ),
        cta.animate([{ width: `${width}px` }, { width: `${endWidth}px` }], {
          duration: RESIZE_MS,
          easing: EASE_OUT_EXPO,
        }),
      ];
    };
  };

  const restored = picker.querySelector('input:checked');
  const restoredTopic = restored instanceof HTMLInputElement ? topicOf(restored) : null;
  if (restoredTopic) {
    cta.href = restoredTopic.href;
    label.textContent = restoredTopic.text;
  }

  picker.addEventListener('change', (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const topic = topicOf(input);
    if (!topic) return;
    cta.href = topic.href;
    swapLabel(topic.text);
    onPick();
  });
}
