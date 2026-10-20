// Física da balança da Têmis: o travessão é uma mola amortecida que busca o nível, e os
// pratos são pêndulos atrasados, empurrados pela aceleração do travessão. Ângulos em graus,
// tempo em segundos.

export const BALANCE = {
  beamStiffness: 13,
  beamDamping: 2.75,
  panStiffness: 32,
  panDamping: 2.8,
  /** Quanto a aceleração do travessão empurra os pratos. */
  panCoupling: 0.55,
  /** Limites do passo de integração: quadros longos (aba em segundo plano) não explodem a mola. */
  minDt: 0.001,
  maxDt: 0.034,
  /** Movimento (px) abaixo do qual a balança é considerada parada: um décimo de pixel na tela. */
  settleArc: 0.1,
} as const;

export interface Point {
  x: number;
  y: number;
}

export interface BalanceState {
  /** Rotação do travessão. */
  angle: number;
  angleVelocity: number;
  /** Desvio dos pratos em relação à vertical. */
  pans: number;
  pansVelocity: number;
}

/** Rotação que deixa os dois pontos (onde os pratos ficam pendurados) na mesma altura. */
export function levelAngle(left: Point, right: Point): number {
  return (-Math.atan2(right.y - left.y, right.x - left.x) * 180) / Math.PI;
}

/** Converte o intervalo entre quadros (ms) no passo de integração (s), dentro dos limites. */
export function clampDt(elapsedMs: number): number {
  return Math.min(BALANCE.maxDt, Math.max(BALANCE.minDt, elapsedMs / 1000));
}

/** Um passo de Euler semi-implícito: a velocidade nova já move a posição no mesmo passo. */
export function stepBalance(state: BalanceState, dt: number, level: number): BalanceState {
  const acceleration =
    -BALANCE.beamStiffness * (state.angle - level) - BALANCE.beamDamping * state.angleVelocity;
  const angleVelocity = state.angleVelocity + acceleration * dt;
  const angle = state.angle + angleVelocity * dt;
  const pansAcceleration =
    -BALANCE.panStiffness * state.pans -
    BALANCE.panDamping * state.pansVelocity -
    BALANCE.panCoupling * acceleration;
  const pansVelocity = state.pansVelocity + pansAcceleration * dt;
  const pans = state.pans + pansVelocity * dt;
  return { angle, angleVelocity, pans, pansVelocity };
}

/**
 * Ângulo (graus) cujo arco, num raio de `radius` px, mede `BALANCE.settleArc`. Com o raio já
 * na escala da tela, a balança para quando falta menos de 0,1 px de movimento, em qualquer tamanho.
 */
export function settleTolerance(radius: number): number {
  return ((BALANCE.settleArc / radius) * 180) / Math.PI;
}

/** Parada: travessão no nível e pratos na vertical, a menos de `tolerance` graus (e graus/s). */
export function isSettled(state: BalanceState, level: number, tolerance: number): boolean {
  return (
    Math.abs(state.angle - level) < tolerance &&
    Math.abs(state.angleVelocity) < tolerance &&
    Math.abs(state.pans) < tolerance &&
    Math.abs(state.pansVelocity) < tolerance
  );
}
