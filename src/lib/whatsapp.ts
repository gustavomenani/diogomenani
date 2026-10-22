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

/** Fecha a frase com ponto, sem repetir a pontuação que já veio digitada. */
const asSentence = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** O que o formulário de contato envia. */
export interface ContactRequest {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

/**
 * Mensagem que o formulário monta; assunto e e-mail ficam de fora quando não foram informados.
 * Nome e relato fecham com ponto: quase ninguém pontua um relato curto, e ele emendaria nos dados
 * de contato ("…visto negado (WhatsApp: …)").
 */
export function buildContactMessage({
  name,
  phone,
  email,
  subject,
  message,
}: ContactRequest): string {
  const trimmedEmail = email.trim();
  return (
    `${GREETING} Meu nome é ${asSentence(name.trim())}` +
    (subject ? ` Assunto: ${subject}.` : '') +
    ` ${asSentence(message.trim())}` +
    ` (WhatsApp: ${phone}${trimmedEmail ? `, e-mail: ${trimmedEmail}` : ''})`
  );
}
