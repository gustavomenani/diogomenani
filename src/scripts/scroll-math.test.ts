import { describe, expect, test } from 'vitest';
import {
  activeSectionIndex,
  activeStepCount,
  isFabVisible,
  isScrolled,
  litWordCount,
  nextTuck,
} from './scroll-math';
import type { MotionMode } from './motion-mode';

describe('isScrolled', () => {
  test('o header ganha fundo só depois de 24 px', () => {
    expect(isScrolled(24)).toBe(false);
    expect(isScrolled(25)).toBe(true);
  });
});

describe('activeSectionIndex', () => {
  test('nenhuma seção chegou à linha de 40% da tela', () => {
    expect(activeSectionIndex([500, 800], 900)).toBe(-1);
  });

  test('a seção exatamente na linha conta como ativa', () => {
    expect(activeSectionIndex([300, 360, 361], 900)).toBe(1);
  });

  test('vale a última seção que já passou da linha', () => {
    expect(activeSectionIndex([-1200, -100, 200, 900], 900)).toBe(2);
  });
});

describe('activeStepCount', () => {
  test('em linha, nenhuma etapa acende antes de o bloco chegar a 86% da tela', () => {
    expect(activeStepCount([860, 860, 860, 860], 1000)).toBe(0);
  });

  test('em linha, a primeira acende assim que o bloco entra na faixa', () => {
    expect(activeStepCount([800, 800, 801, 800], 1000)).toBe(1);
  });

  test('em linha, todas acendem quando o bloco passa de 44% da tela', () => {
    expect(activeStepCount([400, 400, 400, 400], 1000)).toBe(4);
  });

  test('em linha, o meio da faixa acende proporcionalmente', () => {
    // p = (860 − 650) / 420 = 0,5 → 1 + floor(0,5 × 3) = 2
    expect(activeStepCount([650, 650, 650, 650], 1000)).toBe(2);
  });

  test('topos a até 3 px de diferença ainda contam como a mesma linha', () => {
    // Em linha: p = (860 − 400) / 420 > 1 → todas; empilhadas: só as acima de 700 → nenhuma.
    expect(activeStepCount([400, 403], 1000)).toBe(2);
    expect(activeStepCount([800, 804], 1000)).toBe(0);
  });

  test('empilhadas, contam as etapas que passaram de 70% da tela', () => {
    expect(activeStepCount([100, 500, 690, 701], 1000)).toBe(3);
  });

  test('empilhadas, a etapa exatamente na linha de 70% ainda não acende', () => {
    expect(activeStepCount([100, 700], 1000)).toBe(1);
  });

  test('sem etapas, nada acende', () => {
    expect(activeStepCount([], 1000)).toBe(0);
  });
});

describe('litWordCount', () => {
  test('a frase ainda abaixo de 90% da tela não acende nada', () => {
    expect(litWordCount({ top: 900, height: 200, viewportHeight: 1000, words: 28 })).toBe(0);
  });

  test('no meio do percurso, acende metade', () => {
    // p = (900 − 640) / (200 + 320) = 0,5
    expect(litWordCount({ top: 640, height: 200, viewportHeight: 1000, words: 28 })).toBe(14);
  });

  test('a contagem arredonda para a palavra mais próxima', () => {
    // p = (900 − 608,8) / 520 = 0,56 → 5,6 palavras → 6
    expect(litWordCount({ top: 608.8, height: 200, viewportHeight: 1000, words: 10 })).toBe(6);
  });

  test('ao fim do percurso, acende todas e não passa disso', () => {
    expect(litWordCount({ top: -500, height: 200, viewportHeight: 1000, words: 28 })).toBe(28);
  });
});

describe('nextTuck', () => {
  const base = {
    heroHeight: 900,
    mode: 'on' as MotionMode,
    menuOpen: false,
    headerHasVisibleFocus: false,
  };

  /** Rola pelas posições dadas, quadro a quadro, e diz se o header termina recolhido. */
  function tuckedAfter(
    positions: readonly number[],
    { tucked = false, ...overrides }: Partial<typeof base> & { tucked?: boolean } = {},
  ): boolean {
    let state = { tucked, travel: 0 };
    let lastY = positions[0] ?? 0;
    for (const y of positions.slice(1)) {
      state = nextTuck({ ...base, ...overrides, ...state, y, lastY });
      lastY = y;
    }
    return state.tucked;
  }

  test('recolhe ao descer depois de 85% do hero', () => {
    expect(tuckedAfter([900, 1000])).toBe(true);
  });

  test('conta a distância acumulada: 3 px duas vezes recolhem', () => {
    expect(tuckedAfter([1000, 1003])).toBe(false);
    expect(tuckedAfter([1000, 1003, 1006])).toBe(true);
  });

  test('volta com −3 px duas vezes', () => {
    expect(tuckedAfter([1006, 1003], { tucked: true })).toBe(true);
    expect(tuckedAfter([1006, 1003, 1000], { tucked: true })).toBe(false);
  });

  test('ir e voltar 3 px não muda o estado', () => {
    const zigzag = [1000, 1003, 1000, 1003, 1000, 1003, 1000];
    expect(tuckedAfter(zigzag)).toBe(false);
    expect(tuckedAfter(zigzag, { tucked: true })).toBe(true);
  });

  test('movimentos de até 4 px mantêm o estado atual', () => {
    expect(tuckedAfter([1000, 1004])).toBe(false);
    expect(tuckedAfter([1000, 996], { tucked: true })).toBe(true);
  });

  test('trocar de direção zera a distância acumulada', () => {
    // Desceu 3, subiu 1 e desceu 3 de novo: só 3 px na direção atual.
    expect(tuckedAfter([1000, 1003, 1002, 1005])).toBe(false);
  });

  test('reaparece ao subir', () => {
    expect(tuckedAfter([950, 900], { tucked: true })).toBe(false);
  });

  test('reaparece de volta ao hero', () => {
    expect(tuckedAfter([700, 765], { tucked: true })).toBe(false);
  });

  test('com movimento reduzido também recolhe', () => {
    expect(tuckedAfter([900, 1000], { mode: 'reduced' })).toBe(true);
  });

  test('numa página estática nunca recolhe', () => {
    expect(tuckedAfter([900, 1000], { mode: 'static' })).toBe(false);
    expect(tuckedAfter([1000, 1000], { mode: 'static', tucked: true })).toBe(false);
  });

  test('não recolhe com o menu aberto', () => {
    expect(tuckedAfter([900, 1000], { menuOpen: true })).toBe(false);
  });

  test('com o foco visível dentro do header, ele não recolhe', () => {
    expect(tuckedAfter([900, 1000], { headerHasVisibleFocus: true })).toBe(false);
    expect(tuckedAfter([1000, 1000], { headerHasVisibleFocus: true, tucked: true })).toBe(false);
  });
});

describe('isFabVisible', () => {
  const base = {
    mode: 'on' as const,
    heroHeight: 900,
    viewportHeight: 1000,
    contact: null,
    footerTop: null,
  };

  test('aparece depois de 75% do hero', () => {
    expect(isFabVisible({ ...base, y: 676 })).toBe(true);
    expect(isFabVisible({ ...base, y: 675 })).toBe(false);
  });

  test('some quando o contato entra nos 80% de cima da tela', () => {
    expect(isFabVisible({ ...base, y: 3000, contact: { top: 799, bottom: 1500 } })).toBe(false);
    expect(isFabVisible({ ...base, y: 3000, contact: { top: 800, bottom: 1500 } })).toBe(true);
  });

  test('volta quando o contato já saiu por cima da tela', () => {
    expect(isFabVisible({ ...base, y: 3000, contact: { top: -900, bottom: 0 } })).toBe(true);
  });

  test('some quando o rodapé aparece', () => {
    expect(isFabVisible({ ...base, y: 5000, footerTop: 999 })).toBe(false);
    expect(isFabVisible({ ...base, y: 5000, footerTop: 1000 })).toBe(true);
  });

  test('nunca aparece numa página estática', () => {
    expect(isFabVisible({ ...base, mode: 'static', y: 2000 })).toBe(false);
  });
});
