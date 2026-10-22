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
  test('sem etapas, nenhuma acesa', () => {
    expect(activeStepCount([], 1000)).toBe(0);
  });

  test('contam as etapas que passaram de 70% da tela', () => {
    expect(activeStepCount([100, 500, 690, 701], 1000)).toBe(3);
  });

  test('a etapa exatamente na linha de 70% ainda não acende', () => {
    expect(activeStepCount([100, 700], 1000)).toBe(1);
  });

  test('1 px acima da linha de 70% a etapa acende', () => {
    // mata: top < 0,7 × altura virando top < 0,7 × altura − 1 em activeStepCount
    expect(activeStepCount([100, 699], 1000)).toBe(2);
  });
});

describe('litWordCount', () => {
  test('a frase ainda abaixo de 90% da tela não acende nada', () => {
    expect(litWordCount({ top: 900, height: 200, viewportHeight: 1000, words: 28 })).toBe(0);
  });

  test('1 px acima da linha de 90%, a fração de palavra ainda não acende', () => {
    // p = 1 / 520 → 0,05 palavra
    // mata: Math.round virando Math.ceil em litWordCount
    expect(litWordCount({ top: 899, height: 200, viewportHeight: 1000, words: 28 })).toBe(0);
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

  test('acende todas exatamente no fim do percurso, e 1 px antes ainda falta uma', () => {
    // Com 1000 palavras cada pixel conta: p = (900 − 380) / 520 = 1 acende todas; 1 px antes, 998.
    // mata: STATEMENT_EXTRA 0,32 virando 0,33 em litWordCount
    expect(litWordCount({ top: 380, height: 200, viewportHeight: 1000, words: 1000 })).toBe(1000);
    expect(litWordCount({ top: 381, height: 200, viewportHeight: 1000, words: 1000 })).toBe(998);
  });
});

describe('nextTuck', () => {
  const base = {
    heroHeight: 900,
    mode: 'on' as MotionMode,
    menuOpen: false,
    headerHasVisibleFocus: false,
    hold: false,
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

  test('5 px numa direção já mudam o estado', () => {
    // mata: travel > 4 virando travel > 5 em nextTuck
    expect(tuckedAfter([1000, 1005])).toBe(true);
    // mata: travel < −4 virando travel < −5 em nextTuck
    expect(tuckedAfter([1000, 995], { tucked: true })).toBe(false);
  });

  test('um quadro sem rolagem não zera a distância acumulada', () => {
    // mata: delta === 0 removido do acúmulo em nextTuck
    expect(tuckedAfter([1000, 1003, 1003, 1006])).toBe(true);
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

  test('1 px depois de 85% do hero já recolhe', () => {
    // mata: y <= 0,85 × hero virando y <= 0,85 × hero + 1 em nextTuck
    expect(tuckedAfter([700, 766])).toBe(true);
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

  test('a rolagem de um link interno não recolhe o header, e o traz de volta', () => {
    // mata: o hold fora da primeira condição de nextTuck (a âncora pousava com o header recolhido)
    expect(tuckedAfter([900, 1500, 2400], { hold: true })).toBe(false);
    expect(tuckedAfter([2400, 2400], { hold: true, tucked: true })).toBe(false);
  });
});

describe('isFabVisible', () => {
  const base = {
    mode: 'on' as const,
    heroHeight: 900,
    viewportHeight: 1000,
    heroCtaBottom: null,
    headerBottom: 84,
    contact: null,
    footerTop: null,
  };

  test('aparece depois de 75% do hero', () => {
    expect(isFabVisible({ ...base, y: 676 })).toBe(true);
    expect(isFabVisible({ ...base, y: 675 })).toBe(false);
  });

  test('aparece antes, assim que o botão do hero passa por baixo do header', () => {
    // mata: heroCtaBottom < headerBottom virando heroCtaBottom <= headerBottom
    expect(isFabVisible({ ...base, y: 600, heroCtaBottom: 83.5 })).toBe(true);
    expect(isFabVisible({ ...base, y: 600, heroCtaBottom: 84 })).toBe(false);
  });

  test('com o header recolhido, espera o botão do hero sair da tela', () => {
    expect(isFabVisible({ ...base, y: 600, heroCtaBottom: 40, headerBottom: -2 })).toBe(false);
    expect(isFabVisible({ ...base, y: 600, heroCtaBottom: -3, headerBottom: -2 })).toBe(true);
  });

  test('some quando o botão do contato entra inteiro na tela', () => {
    // mata: a regra do contato pela fração de 80% da tela (com o botão do contato ainda fora da
    // tela, nenhum botão do WhatsApp ficava à vista)
    const contact = (ctaBottom: number) => ({ ctaBottom, ctaTop: 900, bottom: 1500 });
    expect(isFabVisible({ ...base, y: 3000, contact: contact(999) })).toBe(false);
    expect(isFabVisible({ ...base, y: 3000, contact: contact(1000) })).toBe(true);
  });

  test('com movimento, espera o bloco do botão do contato passar da linha de revelação (92%)', () => {
    // O botão inteiro na tela, mas o bloco dele ainda abaixo da linha: invisível.
    // mata: o ctaShown em isFabVisible (nenhum botão do WhatsApp à vista nesses 12 a 52 px)
    const contact = (ctaTop: number) => ({ ctaBottom: 976, ctaTop, bottom: 1500 });
    expect(isFabVisible({ ...base, y: 3000, contact: contact(920) })).toBe(true);
    expect(isFabVisible({ ...base, y: 3000, contact: contact(919.5) })).toBe(false);
  });

  test('com movimento reduzido, tudo já aparece: some com o botão do contato inteiro na tela', () => {
    const contact = { ctaBottom: 999, ctaTop: 943, bottom: 1500 };
    expect(isFabVisible({ ...base, mode: 'reduced', y: 3000, contact })).toBe(false);
    expect(isFabVisible({ ...base, y: 3000, contact })).toBe(true);
  });

  test('volta quando o contato já saiu por cima da tela', () => {
    const contact = { ctaBottom: -500, ctaTop: -556, bottom: 0 };
    expect(isFabVisible({ ...base, y: 3000, contact })).toBe(true);
  });

  test('com 1 px do contato ainda na tela, continua escondido', () => {
    // mata: contact.bottom > 0 virando contact.bottom > 1 em isFabVisible
    const contact = { ctaBottom: -499, ctaTop: -555, bottom: 1 };
    expect(isFabVisible({ ...base, y: 3000, contact })).toBe(false);
  });

  test('some quando o rodapé aparece', () => {
    expect(isFabVisible({ ...base, y: 5000, footerTop: 999 })).toBe(false);
    expect(isFabVisible({ ...base, y: 5000, footerTop: 1000 })).toBe(true);
  });

  test('nunca aparece numa página estática', () => {
    expect(isFabVisible({ ...base, mode: 'static', y: 2000 })).toBe(false);
    expect(isFabVisible({ ...base, mode: 'static', y: 2000, heroCtaBottom: -100 })).toBe(false);
  });
});
