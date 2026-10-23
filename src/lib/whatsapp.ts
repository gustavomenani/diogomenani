// Links e mensagens do WhatsApp: a única fonte para todo texto que o site envia ao escritório.
import { whatsapp } from '../data/contact';

const GREETING = 'Olá!';

/** Mensagens prontas que abrem a conversa; `topic` recebe o assunto da área (`subject`). */
export const messages = {
  default: `${GREETING} Gostaria de falar com um especialista.`,
  topic: (subject: string) => `${GREETING} Gostaria de falar com um especialista sobre ${subject}.`,
  unlistedCase: `${GREETING} Gostaria de saber se vocês podem me ajudar com um caso.`,
} as const;

/**
 * Link do WhatsApp do escritório, com mensagem pronta quando `text` é informado. Um caractere
 * inválido (metade de um emoji, por exemplo) vira �: o encodeURIComponent lançaria.
 */
export function waLink(text?: string): string {
  const base = `https://wa.me/${whatsapp.number}`;
  return text ? `${base}?text=${encodeURIComponent(text.toWellFormed())}` : base;
}
