/** Formata até 11 dígitos como telefone brasileiro: (DD) NNNN-NNNN ou (DD) NNNNN-NNNN. */
export function formatPhone(digits: string): string {
  if (digits.length > 6) {
    const split = digits.length - 4;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
  }
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
}

export interface MaskedPhone {
  value: string;
  /** Posição do cursor no valor formatado: logo depois do mesmo dígito de antes. */
  caret: number;
}

/** Código do Brasil: com ele, o número ganha a máscara nacional. */
const BRAZIL = '55';

const countDigits = (text: string) => text.replace(/\D/g, '').length;

/** Posição logo depois do enésimo dígito de `text` (0: o início). */
function afterDigit(text: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text.charAt(index)) && ++seen === count) return index + 1;
  }
  return text.length;
}

/**
 * '00' antes do país: o prefixo internacional da Europa e do Brasil, e o jeito como muita gente que
 * mora fora escreve o próprio número. Nenhum DDD começa com 0.
 */
const DIAL_PREFIX = /^(\s*)00\s*(?=[1-9])/;

/**
 * Troca o prefixo 00 pelo +, e o número segue o caminho do +. Sem isso, os zeros saíam como zeros
 * à esquerda do DDD e o número de fora virava um número brasileiro falso: 00351 912 345 678 ficava
 * (35) 19123-4567. O cursor desconta os caracteres que saíram; dentro do 00, vai para depois do +.
 */
function dialPrefixToPlus(text: string, caret: number): { text: string; caret: number } {
  const match = DIAL_PREFIX.exec(text);
  if (!match) return { text, caret };
  const [prefix, indent = ''] = match;
  const plus = indent.length + 1;
  return {
    text: `${indent}+${text.slice(prefix.length)}`,
    caret: caret >= prefix.length ? caret - prefix.length + plus : Math.min(caret, plus),
  };
}

/**
 * Aplica a máscara ao que foi digitado ou colado e reposiciona o cursor: editar no meio do
 * número não o joga para o fim. Dígitos de largura total (teclados asiáticos) viram comuns; o +55
 * e os zeros à esquerda do DDD saem; com o + (ou o 00) de outro país, o número fica como foi
 * digitado. `inputType` é o do evento de input: 'insertText' é a digitação de um caractere; colar e
 * o preenchimento automático chegam com outro.
 */
export function maskPhone(value: string, caret: number, inputType?: string): MaskedPhone {
  const normalized = value.normalize('NFKC');
  const normalizedCaret = value.slice(0, caret).normalize('NFKC').length;
  // O 0 e o 00 sozinhos ficam: podem ser o começo do prefixo internacional, e a digitação nunca
  // chegaria a ele se o zero sumisse a cada tecla.
  if (/^\s*00?\s*$/.test(normalized)) return { value: normalized, caret: normalizedCaret };
  const { text: typed, caret: typedCaret } = dialPrefixToPlus(normalized, normalizedCaret);
  const allDigits = typed.replace(/\D/g, '');
  const international = typed.trimStart().startsWith('+');
  // Outro país, ou o próprio +55 ainda sendo digitado: nada a formatar por enquanto.
  if (international && (!allDigits.startsWith(BRAZIL) || allDigits === BRAZIL)) {
    return { value: typed, caret: typedCaret };
  }
  // Sem o +, o 55 só é o código do país num número colado (ou preenchido) que passa dos 11
  // dígitos. Na digitação, o dígito a mais é cortado: com DDD 55, (55) 99123-4567 seguido de um 8
  // viraria (99) 1234-5678, outro número.
  const pasted = inputType !== 'insertText';
  const countryCode =
    allDigits.startsWith(BRAZIL) && (international || (pasted && allDigits.length > 11))
      ? BRAZIL.length
      : 0;
  const leadingZeros = /^0*/.exec(allDigits.slice(countryCode))?.[0].length ?? 0;
  const skipped = countryCode + leadingZeros;
  const digits = allDigits.slice(skipped, skipped + 11);
  const formatted = formatPhone(digits);
  const kept = Math.min(digits.length, countDigits(typed.slice(0, typedCaret)) - skipped);
  return { value: formatted, caret: afterDigit(formatted, kept) };
}
