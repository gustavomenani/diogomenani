/** Formata até 11 dígitos como telefone brasileiro: (DD) NNNN-NNNN ou (DD) NNNNN-NNNN. */
export function formatPhone(digits: string): string {
  if (digits.length > 6) {
    const split = digits.length - 4;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
  }
  if (digits.length > 2) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return digits;
}

/** Aplica a máscara ao que foi digitado ou colado; um número com +55 perde o código do país. */
export function maskPhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (digits.length > 11 && digits.startsWith('55')) digits = digits.slice(2);
  return formatPhone(digits.slice(0, 11));
}
