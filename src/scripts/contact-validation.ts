import type { ContactRequest } from '../lib/whatsapp';

export type ContactField = 'name' | 'phone' | 'email' | 'message' | 'consent';

export interface ContactValues extends ContactRequest {
  consent: boolean;
}

const EMAIL = /^\S+@\S+\.\S+$/;
/** DDD + número fixo. */
const MIN_PHONE_DIGITS = 10;

/** Campos inválidos, na ordem em que aparecem no formulário (o primeiro recebe o foco). */
export function validateContact(values: ContactValues): ContactField[] {
  const invalid: ContactField[] = [];
  if (!values.name.trim()) invalid.push('name');
  if (values.phone.replace(/\D/g, '').length < MIN_PHONE_DIGITS) invalid.push('phone');
  const email = values.email.trim();
  if (email && !EMAIL.test(email)) invalid.push('email');
  if (!values.message.trim()) invalid.push('message');
  if (!values.consent) invalid.push('consent');
  return invalid;
}
