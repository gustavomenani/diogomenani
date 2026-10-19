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
  test('número colado com +55 perde o código do país', () => {
    expect(maskPhone('+55 18 99701-7249')).toBe('(18) 99701-7249');
  });

  test('dígitos além de 11 são descartados', () => {
    expect(maskPhone('189970172491234')).toBe('(18) 99701-7249');
  });

  test('número com 12 dígitos que não começa com 55 só é cortado', () => {
    expect(maskPhone('189970172499')).toBe('(18) 99701-7249');
  });

  test('valor já formatado continua igual', () => {
    expect(maskPhone('(18) 99701-7249')).toBe('(18) 99701-7249');
  });
});
