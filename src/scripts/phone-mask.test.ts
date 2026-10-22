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

  test('com 6 dígitos ainda não há hífen', () => {
    expect(formatPhone('189970')).toBe('(18) 9970');
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

  test('celular com 11 dígitos e fixo com 10 ganham a máscara inteira', () => {
    // mata: skipped + 11 virando skipped + 10 em maskPhone
    expect(atEnd('18997017249')).toBe('(18) 99701-7249');
    // mata: digits.length − 4 virando digits.length − 5 em formatPhone
    expect(atEnd('1834567890')).toBe('(18) 3456-7890');
  });

  test('digitando, um dígito a mais com DDD 55 é cortado, sem virar o código do país', () => {
    const typed = '(55) 99123-45678';
    expect(maskPhone(typed, typed.length, 'insertText').value).toBe('(55) 99123-4567');
  });

  test('colado ou preenchido, o 55 sem o + continua sendo o código do país', () => {
    expect(maskPhone('5518997017249', 13, 'insertFromPaste').value).toBe('(18) 99701-7249');
    expect(maskPhone('+55 18 99701-7249', 17, 'insertFromPaste').value).toBe('(18) 99701-7249');
    expect(maskPhone('5518997017249', 13, 'insertReplacementText').value).toBe('(18) 99701-7249');
  });

  test('digitando com o +55, o 55 continua sendo o código do país', () => {
    expect(maskPhone('+55 18 9', 8, 'insertText')).toEqual({ value: '(18) 9', caret: 6 });
  });

  test('sem o +, 55 seguido de um fixo de 10 dígitos perde o código do país', () => {
    // 12 dígitos: um a mais que o maior número nacional.
    // mata: allDigits.length > 11 virando allDigits.length > 12 em maskPhone
    expect(atEnd('551834567890')).toBe('(18) 3456-7890');
  });

  test('com um espaço antes do +55, o 55 continua sendo o código do país', () => {
    // mata: trimStart removido da detecção do + em maskPhone
    expect(atEnd(' +55 18 9')).toBe('(18) 9');
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

  test('só com o DDD, o cursor fica onde estava', () => {
    expect(maskPhone('18', 1)).toEqual({ value: '18', caret: 1 });
  });

  test('zeros à esquerda do DDD saem', () => {
    expect(atEnd('018 99701-7249')).toBe('(18) 99701-7249');
    expect(atEnd('(018) 99701-7249')).toBe('(18) 99701-7249');
  });

  test('mais de um zero à esquerda do DDD também sai', () => {
    // Separados por espaço, os zeros não são o prefixo internacional 00.
    // mata: /^0*/ virando /^0?/ em maskPhone
    expect(atEnd('0 018 99701-7249')).toBe('(18) 99701-7249');
  });

  test('com +55, o zero antes do DDD também sai', () => {
    // mata: zeros contados desde o início (allDigits) em vez de depois do código do país
    expect(atEnd('+55 (018) 99701-7249')).toBe('(18) 99701-7249');
  });

  test('o cursor desconta os zeros à esquerda que saíram', () => {
    // Cursor logo depois do 8 de "018": no valor formatado, logo depois do 8 de "(18".
    // mata: − skipped virando − countryCode no cálculo do cursor em maskPhone
    expect(maskPhone('018 99701-7249', 3)).toEqual({ value: '(18) 99701-7249', caret: 3 });
  });

  test('número com + e código de outro país fica como foi digitado', () => {
    expect(maskPhone('+351 912 345 678', 9)).toEqual({ value: '+351 912 345 678', caret: 9 });
    expect(atEnd('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
  });

  test('com o prefixo internacional 00, o número de outro país fica com o + no lugar dele', () => {
    // mata: o 00 lido como zeros à esquerda do DDD ("(35) 19123-4567", um número brasileiro falso)
    const paste = (value: string) => maskPhone(value, value.length, 'insertFromPaste').value;
    expect(paste('00351 912 345 678')).toBe('+351 912 345 678');
    expect(paste('001 305 555 0123')).toBe('+1 305 555 0123');
    expect(paste('00 33 6 12 34 56 78')).toBe('+33 6 12 34 56 78');
    expect(atEnd('0049 30 123456')).toBe('+49 30 123456');
  });

  test('com 00 e o 55, o número ganha a máscara nacional', () => {
    expect(maskPhone('0055 18 99701-7249', 18, 'insertFromPaste')).toEqual({
      value: '(18) 99701-7249',
      caret: 15,
    });
    expect(atEnd('00 55 (018) 99701-7249')).toBe('(18) 99701-7249');
  });

  test('a troca do 00 pelo + desconta o zero a mais do cursor', () => {
    // Cursor logo depois de "912": no valor novo, no mesmo lugar, um caractere antes.
    expect(maskPhone('00351 912 345 678', 9)).toEqual({ value: '+351 912 345 678', caret: 8 });
    // Cursor entre os dois zeros: logo depois do +.
    expect(maskPhone('00351 912 345 678', 1)).toEqual({ value: '+351 912 345 678', caret: 1 });
  });

  test('digitando, o 0 e o 00 ficam como estão, e o país seguinte troca o 00 pelo +', () => {
    expect(maskPhone('0', 1, 'insertText')).toEqual({ value: '0', caret: 1 });
    expect(maskPhone('00', 2, 'insertText')).toEqual({ value: '00', caret: 2 });
    expect(maskPhone('003', 3, 'insertText')).toEqual({ value: '+3', caret: 2 });
    // Com um dígito depois do 0 que não é outro 0, o zero sai como antes (zero do DDD).
    expect(maskPhone('01', 2, 'insertText')).toEqual({ value: '1', caret: 1 });
  });

  test('o + e o 55 ainda sendo digitados ficam como estão', () => {
    expect(atEnd('+')).toBe('+');
    expect(atEnd('+5')).toBe('+5');
    expect(atEnd('+55')).toBe('+55');
  });

  test('digitado com +55, o resto do número ganha a máscara', () => {
    expect(maskPhone('+55 18 9', 8)).toEqual({ value: '(18) 9', caret: 6 });
  });

  test('dígitos de largura total (teclados asiáticos) viram dígitos comuns', () => {
    expect(atEnd('１８９９７０１７２４９')).toBe('(18) 99701-7249');
  });
});
