import {
  clampDt,
  isSettled,
  levelAngle,
  settleTolerance,
  stepBalance,
  type BalanceState,
  type Point,
} from './balance-physics';
import type { MotionMode } from './motion-mode';

/** A balança começa a se equilibrar logo depois da entrada da Têmis. */
const SWING_DELAY_MS = 950;
/** Empurrão (graus/s) dado na balança a cada tema escolhido no seletor. */
export const TOPIC_IMPULSE = 24;

export interface Balance {
  /** Dá um empurrão no travessão e anima até a balança assentar de novo. */
  swing(impulse?: number): void;
  /** Para a animação e deixa a balança nivelada na hora. */
  settle(): void;
}

const pivotOf = (element: Element) => element.getAttribute('data-pivot') ?? '0 0';

const pointOf = (element: Element): Point => {
  const [x = 0, y = 0] = pivotOf(element).split(' ').map(Number);
  return { x, y };
};

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/** Escala da figura na tela (px por unidade do desenho); zero se ela estiver escondida. */
function renderedScale(svg: SVGSVGElement | null): number {
  if (!svg) return 0;
  const box = svg.viewBox.baseVal;
  const rect = svg.getBoundingClientRect();
  if (!box.width || !box.height) return 0;
  // O desenho cabe inteiro no <svg> (preserveAspectRatio padrão): vale a menor das escalas.
  return Math.min(rect.width / box.width, rect.height / box.height);
}

/**
 * Anima a balança da Têmis: o travessão gira em torno do seu pivô e cada prato gira em torno do
 * ponto onde está pendurado, compensando o travessão para continuar na vertical.
 */
export function initBalance(root: HTMLElement, getMode: () => MotionMode): Balance | null {
  const beam = root.querySelector('[data-beam]');
  const panLeft = root.querySelector('[data-pan-l]');
  const panRight = root.querySelector('[data-pan-r]');
  if (!beam || !panLeft || !panRight) return null;

  // O desenho original vem inclinado; este é o ângulo que deixa os dois pratos na mesma altura.
  const level = levelAngle(pointOf(panLeft), pointOf(panRight));
  // Raio do movimento: a maior distância do pivô a um ponto onde os pratos ficam pendurados.
  const pivot = pointOf(beam);
  const arm = Math.max(distance(pivot, pointOf(panLeft)), distance(pivot, pointOf(panRight)));
  let tolerance = settleTolerance(arm);
  let state: BalanceState = { angle: 0, angleVelocity: 0, pans: 0, pansVelocity: 0 };
  let frame = 0;
  let lastTime = 0;

  const pose = () => {
    beam.setAttribute('transform', `rotate(${state.angle.toFixed(3)} ${pivotOf(beam)})`);
    const pans = (state.pans - state.angle).toFixed(3);
    panLeft.setAttribute('transform', `rotate(${pans} ${pivotOf(panLeft)})`);
    panRight.setAttribute('transform', `rotate(${pans} ${pivotOf(panRight)})`);
  };

  const settle = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    state = { angle: level, angleVelocity: 0, pans: 0, pansVelocity: 0 };
    pose();
  };

  const tick = (time: number) => {
    const dt = clampDt(time - lastTime);
    lastTime = time;
    state = stepBalance(state, dt, level);
    if (isSettled(state, level, tolerance)) {
      settle();
      return;
    }
    pose();
    frame = requestAnimationFrame(tick);
  };

  const swing = (impulse = 0) => {
    if (getMode() === 'reduced') return;
    state = { ...state, angleVelocity: state.angleVelocity + impulse };
    if (!frame) {
      // Mede a cada balanço, porque o tamanho da figura muda com a janela. Escondida, ela não
      // tem escala na tela e vale a do desenho (1 px por unidade): o raio fica em ~81 px.
      const scale = renderedScale(beam.closest('svg'));
      tolerance = settleTolerance(arm * (scale || 1));
      lastTime = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };

  if (getMode() === 'reduced') {
    settle();
  } else {
    setTimeout(() => {
      swing();
    }, SWING_DELAY_MS);
  }

  return { swing, settle };
}
