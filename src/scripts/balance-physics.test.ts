import { describe, expect, test } from 'vitest';
import { clampDt, isSettled, levelAngle, stepBalance, type BalanceState } from './balance-physics';

/** Pontos onde os pratos ficam pendurados no desenho da Têmis. */
const LEFT = { x: 161, y: 281 };
const RIGHT = { x: 281, y: 331 };
/** −atan2(50, 120) em graus, calculado à parte. */
const LEVEL = -22.619864948040426;
const REST: BalanceState = { angle: 0, angleVelocity: 0, pans: 0, pansVelocity: 0 };

describe('levelAngle', () => {
  test('é o ângulo que deixa os dois pontos na mesma altura', () => {
    expect(levelAngle(LEFT, RIGHT)).toBeCloseTo(LEVEL, 9);
  });

  test('pontos já nivelados não pedem rotação', () => {
    expect(levelAngle({ x: 0, y: 10 }, { x: 50, y: 10 })).toBeCloseTo(0, 12);
  });
});

describe('clampDt', () => {
  test('converte milissegundos em segundos', () => {
    expect(clampDt(16)).toBe(0.016);
  });

  test('limita quadros muito longos (aba em segundo plano) a 34 ms', () => {
    expect(clampDt(1000)).toBe(0.034);
  });

  test('nunca integra com passo zero', () => {
    expect(clampDt(0)).toBe(0.001);
  });
});

describe('stepBalance', () => {
  test('um passo a partir do repouso segue a mola amortecida (valores calculados à mão)', () => {
    // acc = −13·(0 − L) ≈ −294,05824432; v = acc·0,016; ângulo = v·0,016
    // accPratos = −0,55·acc ≈ 161,73203438; vPratos = accPratos·0,016;
    // pratos = vPratos·0,016
    const next = stepBalance(REST, 0.016, LEVEL);
    expect(next.angleVelocity).toBeCloseTo(-4.70493190919, 10);
    expect(next.angle).toBeCloseTo(-0.0752789105471, 10);
    expect(next.pansVelocity).toBeCloseTo(2.58771255006, 10);
    expect(next.pans).toBeCloseTo(0.0414034008009, 10);
  });

  test('a velocidade atualizada entra no mesmo passo (Euler semi-implícito)', () => {
    const next = stepBalance({ ...REST, angleVelocity: 10 }, 0.1, 0);
    // acc = −2,75·10 = −27,5; v = 10 − 2,75 = 7,25; ângulo = 0,725
    expect(next.angleVelocity).toBeCloseTo(7.25, 12);
    expect(next.angle).toBeCloseTo(0.725, 12);
  });

  test('não altera o estado recebido', () => {
    const state = { ...REST };
    stepBalance(state, 0.016, LEVEL);
    expect(state).toEqual(REST);
  });
});

describe('isSettled', () => {
  test('a balança em repouso no nível está assentada', () => {
    expect(isSettled({ ...REST, angle: LEVEL }, LEVEL)).toBe(true);
  });

  test('um centésimo de grau fora do nível ainda não está assentado', () => {
    expect(isSettled({ ...REST, angle: LEVEL + 0.01 }, LEVEL)).toBe(false);
  });

  test('pratos ainda balançando impedem o assentamento', () => {
    expect(isSettled({ ...REST, angle: LEVEL, pansVelocity: 0.02 }, LEVEL)).toBe(false);
  });

  test('partindo do desenho inclinado, passa do nível e assenta antes de 10 s a 60 fps', () => {
    const startSide = Math.sign(REST.angle - LEVEL);
    let state = REST;
    let steps = 0;
    let crossed = false;
    while (!isSettled(state, LEVEL) && steps < 600) {
      state = stepBalance(state, 1 / 60, LEVEL);
      crossed ||= Math.sign(state.angle - LEVEL) === -startSide;
      steps++;
    }
    expect(crossed).toBe(true);
    expect(steps).toBeGreaterThan(60);
    expect(steps).toBeLessThan(600);
  });
});
