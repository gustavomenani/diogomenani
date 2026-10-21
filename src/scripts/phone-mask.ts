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
 * Aplica a máscara ao que foi digitado ou colado e reposiciona o cursor: editar no meio do
 * número não o joga para o fim. Dígitos de largura total (teclados asiáticos) viram comuns; o +55
 * e os zeros à esquerda do DDD saem; com o + de outro país, o número fica como foi digitado.
 * `inputType` é o do evento de input: 'insertText' é a digitação de um caractere; colar e o
 * preenchimento automático chegam com outro.
 */
export function maskPhone(value: string, caret: number, inputType?: string): MaskedPhone {
  const typed = value.normalize('NFKC');
  const typedCaret = value.slice(0, caret).normalize('NFKC').length;
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
