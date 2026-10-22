import { describe, expect, test } from 'vitest';
import { TOPIC_IMPULSE } from './balance';
import {
  BALANCE,
  clampDt,
  isSettled,
  levelAngle,
  pushBalance,
  settleTolerance,
  stepBalance,
  type BalanceState,
} from './balance-physics';

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

describe('pushBalance', () => {
  const AT_LEVEL: BalanceState = { ...REST, angle: LEVEL };

  test('o empurrão de um tema, a partir do repouso no nível, passa inteiro', () => {
    expect(pushBalance(AT_LEVEL, TOPIC_IMPULSE, LEVEL)).toEqual({
      ...AT_LEVEL,
      angleVelocity: TOPIC_IMPULSE,
    });
    expect(pushBalance(AT_LEVEL, -TOPIC_IMPULSE, LEVEL).angleVelocity).toBe(-TOPIC_IMPULSE);
  });

  test('o início da entrada, sem empurrão, continua parado no desenho inclinado', () => {
    expect(pushBalance(REST, 0, LEVEL)).toEqual(REST);
  });

  test('acima do teto (no balanço da entrada), o empurrão não aumenta a velocidade, e o teto não corta a que já existe', () => {
    // O desenho inclinado fica a ~23° do nível, além do teto.
    const swinging: BalanceState = { ...REST, angleVelocity: -30 };
    expect(pushBalance(swinging, -TOPIC_IMPULSE, LEVEL).angleVelocity).toBe(-30);
    // mata: o teto sem o Math.max com a velocidade atual (o travessão pararia no meio da entrada)
    expect(pushBalance(swinging, TOPIC_IMPULSE, LEVEL).angleVelocity).toBeCloseTo(-6, 12);
  });

  // Seta segurada no seletor: um empurrão a cada 33 ms por 4 s, a 60 fps, e mais 2 s assentando.
  const strategies: Record<string, (state: BalanceState) => number> = {
    'sempre para o mesmo lado': () => 1,
    // O pior caso: cada empurrão a favor do movimento, como balançar alguém num balanço.
    'a favor do movimento': (state) => Math.sign(state.angleVelocity) || 1,
  };
  for (const [name, sideOf] of Object.entries(strategies)) {
    test(`trocar o tema depressa, ${name}, não leva o travessão além do teto`, () => {
      // mata: pushBalance só somando o empurrão, sem o teto (o travessão passava de 60°)
      const dt = 1 / 60;
      let state = AT_LEVEL;
      let nextPush = 0;
      let widest = 0;
      for (let time = 0; time < 6; time += dt) {
        if (time < 4 && time >= nextPush) {
          state = pushBalance(state, sideOf(state) * TOPIC_IMPULSE, LEVEL);
          nextPush += 0.033;
        }
        state = stepBalance(state, dt, LEVEL);
        widest = Math.max(widest, Math.abs(state.angle - LEVEL));
      }
      // Uma folga de 1% para o passo de integração, que não conserva a energia à risca.
      expect(widest).toBeLessThanOrEqual(BALANCE.maxSwing * 1.01);
    });
  }
});

describe('settleTolerance', () => {
  // 0,1 px de arco: 0,1 / raio em radianos.
  test('num raio de 573 px, 0,1 px de arco é um centésimo de grau', () => {
    expect(settleTolerance(573)).toBeCloseTo(0.01, 5);
  });

  test('num raio de 100 px, 0,1 px de arco é 0,0573°', () => {
    expect(settleTolerance(100)).toBeCloseTo(0.0573, 5);
  });
});

describe('isSettled', () => {
  const TOL = settleTolerance(100);
  const AT_LEVEL: BalanceState = { ...REST, angle: LEVEL };

  test('a balança em repouso no nível está assentada', () => {
    expect(isSettled(AT_LEVEL, LEVEL, TOL)).toBe(true);
  });

  test('o travessão assenta logo abaixo da tolerância, não logo acima', () => {
    expect(isSettled({ ...AT_LEVEL, angle: LEVEL + 0.9 * TOL }, LEVEL, TOL)).toBe(true);
    expect(isSettled({ ...AT_LEVEL, angle: LEVEL - 1.1 * TOL }, LEVEL, TOL)).toBe(false);
  });

  test('os pratos assentam logo abaixo da tolerância, não logo acima', () => {
    expect(isSettled({ ...AT_LEVEL, pans: -0.9 * TOL }, LEVEL, TOL)).toBe(true);
    expect(isSettled({ ...AT_LEVEL, pans: 1.1 * TOL }, LEVEL, TOL)).toBe(false);
  });

  test('as velocidades usam a mesma tolerância, por segundo', () => {
    expect(isSettled({ ...AT_LEVEL, angleVelocity: 0.9 * TOL }, LEVEL, TOL)).toBe(true);
    expect(isSettled({ ...AT_LEVEL, angleVelocity: -1.1 * TOL }, LEVEL, TOL)).toBe(false);
    expect(isSettled({ ...AT_LEVEL, pansVelocity: -0.9 * TOL }, LEVEL, TOL)).toBe(true);
    expect(isSettled({ ...AT_LEVEL, pansVelocity: 1.1 * TOL }, LEVEL, TOL)).toBe(false);
  });

  test('exatamente na tolerância, nenhuma das quatro grandezas assenta', () => {
    // Nível zero: com LEVEL, (LEVEL + TOL) − LEVEL sai um tico abaixo de TOL em ponto flutuante.
    // mata: < virando <= na comparação do ângulo em isSettled
    expect(isSettled({ ...REST, angle: TOL }, 0, TOL)).toBe(false);
    // mata: < virando <= na comparação da velocidade do travessão em isSettled
    expect(isSettled({ ...AT_LEVEL, angleVelocity: TOL }, LEVEL, TOL)).toBe(false);
    // mata: < virando <= na comparação dos pratos em isSettled
    expect(isSettled({ ...AT_LEVEL, pans: TOL }, LEVEL, TOL)).toBe(false);
    // mata: < virando <= na comparação da velocidade dos pratos em isSettled
    expect(isSettled({ ...AT_LEVEL, pansVelocity: TOL }, LEVEL, TOL)).toBe(false);
  });

  test('acima da tolerância, para qualquer lado, nenhuma das quatro grandezas assenta', () => {
    for (const sign of [1, -1]) {
      const over = sign * 1.1 * TOL;
      // mata: Math.abs removido do ângulo em isSettled
      expect(isSettled({ ...AT_LEVEL, angle: LEVEL + over }, LEVEL, TOL)).toBe(false);
      // mata: Math.abs removido da velocidade do travessão em isSettled
      expect(isSettled({ ...AT_LEVEL, angleVelocity: over }, LEVEL, TOL)).toBe(false);
      // mata: Math.abs removido dos pratos em isSettled
      expect(isSettled({ ...AT_LEVEL, pans: over }, LEVEL, TOL)).toBe(false);
      // mata: Math.abs removido da velocidade dos pratos em isSettled
      expect(isSettled({ ...AT_LEVEL, pansVelocity: over }, LEVEL, TOL)).toBe(false);
    }
  });

  test('o travessão é medido em relação ao nível, não ao zero', () => {
    // mata: state.angle − level virando state.angle em isSettled
    expect(isSettled({ ...REST, angle: 0 }, LEVEL, TOL)).toBe(false);
  });

  test('partindo do desenho inclinado, passa do nível e assenta antes de 10 s a 60 fps', () => {
    // Um centésimo de grau, bem mais apertado que o da tela (o raio renderizado fica abaixo de
    // 100 px): assentar assim garante assentar com qualquer raio menor.
    const tolerance = settleTolerance(573);
    const startSide = Math.sign(REST.angle - LEVEL);
    let state = REST;
    let steps = 0;
    let crossed = false;
    while (!isSettled(state, LEVEL, tolerance) && steps < 600) {
      state = stepBalance(state, 1 / 60, LEVEL);
      crossed ||= Math.sign(state.angle - LEVEL) === -startSide;
      steps++;
    }
    expect(crossed).toBe(true);
    expect(steps).toBeGreaterThan(60);
    expect(steps).toBeLessThan(600);
  });
});
