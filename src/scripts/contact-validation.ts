import type { ContactRequest } from '../lib/whatsapp';

/** Campos validados, na ordem do formulário: o primeiro inválido recebe o foco. */
export const CONTACT_FIELDS = ['name', 'phone', 'email', 'message', 'consent'] as const;

export type ContactField = (typeof CONTACT_FIELDS)[number];

export interface ContactValues extends ContactRequest {
  consent: boolean;
}

const EMAIL = /^\S+@\S+\.\S+$/;
/** DDD + número fixo. */
const MIN_PHONE_DIGITS = 10;

const isValid: Record<ContactField, (values: ContactValues) => boolean> = {
  name: ({ name }) => name.trim() !== '',
  phone: ({ phone }) => phone.replace(/\D/g, '').length >= MIN_PHONE_DIGITS,
  // Opcional: vazio vale; preenchido, precisa ter cara de e-mail.
  email: ({ email }) => email.trim() === '' || EMAIL.test(email.trim()),
  message: ({ message }) => message.trim() !== '',
  consent: ({ consent }) => consent,
};

/** Campos inválidos, na ordem do formulário. */
export function validateContact(values: ContactValues): ContactField[] {
  return CONTACT_FIELDS.filter((field) => !isValid[field](values));
}
