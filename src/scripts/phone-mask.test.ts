import { describe, expect, test } from 'vitest';
import { formatPhone, maskPhone } from './phone-mask';

describe('formatPhone', () => {
  test('celular com 11 dígitos', () => {
    expect(formatPhone('18997017249')).toBe('(18) 99701-7249');
  });

  test('fixo com 10 dígitos', () => {
    expect(formatPhone('1834567890')).toBe('(18) 3456-7890');
  });

  test('até o DDD, nada é formatado', () => {
    expect(formatPhone('18')).toBe('18');
  });

  test('depois do DDD, abre os parênteses', () => {
    expect(formatPhone('189')).toBe('(18) 9');
  });

  test('a partir de 7 dígitos, o hífen separa os 4 últimos', () => {
    expect(formatPhone('1899701')).toBe('(18) 9-9701');
  });
});

describe('maskPhone', () => {
  /** Máscara com o cursor no fim, como quem digita em sequência. */
  const atEnd = (value: string) => maskPhone(value, value.length).value;

  test('número colado com +55 perde o código do país', () => {
    expect(atEnd('+55 18 99701-7249')).toBe('(18) 99701-7249');
  });

  test('dígitos além de 11 são descartados', () => {
    expect(atEnd('189970172491234')).toBe('(18) 99701-7249');
  });

  test('DDD 55 com 11 dígitos não é confundido com o código do país', () => {
    expect(atEnd('55991234567')).toBe('(55) 99123-4567');
  });

  test('número com 12 dígitos que não começa com 55 só é cortado', () => {
    expect(atEnd('189970172499')).toBe('(18) 99701-7249');
  });

  test('valor já formatado continua igual, com o cursor no mesmo lugar', () => {
    expect(maskPhone('(18) 99701-7249', 15)).toEqual({ value: '(18) 99701-7249', caret: 15 });
  });

  test('apagar o parêntese inicial deixa o cursor no começo', () => {
    expect(maskPhone('18) 99701-7249', 0)).toEqual({ value: '(18) 99701-7249', caret: 0 });
  });

  test('apagar o hífen só move o cursor para antes dele', () => {
    expect(maskPhone('(18) 997017249', 10)).toEqual({ value: '(18) 99701-7249', caret: 10 });
  });

  test('digitar no meio mantém o cursor logo depois do dígito digitado', () => {
    expect(maskPhone('(18) 995701-7249', 8)).toEqual({ value: '(18) 99570-1724', caret: 8 });
  });

  test('ao colar com +55, o cursor desconta os dígitos do país', () => {
    expect(maskPhone('+55 18 99701-7249', 17)).toEqual({ value: '(18) 99701-7249', caret: 15 });
  });

  test('cursor dentro do +55 vai para o início', () => {
    expect(maskPhone('+55 18 99701-7249', 2)).toEqual({ value: '(18) 99701-7249', caret: 0 });
  });
});
