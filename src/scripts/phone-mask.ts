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
 * número não o joga para o fim. Um número com +55 perde o código do país.
 */
export function maskPhone(value: string, caret: number): MaskedPhone {
  const allDigits = value.replace(/\D/g, '');
  const countryCode = allDigits.length > 11 && allDigits.startsWith('55') ? 2 : 0;
  const digits = allDigits.slice(countryCode, countryCode + 11);
  const formatted = formatPhone(digits);
  const kept = Math.min(digits.length, countDigits(value.slice(0, caret)) - countryCode);
  return { value: formatted, caret: afterDigit(formatted, kept) };
}
