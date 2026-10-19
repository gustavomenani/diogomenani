import { describe, expect, test } from 'vitest';
import { validateContact, type ContactValues } from './contact-validation';

const valid: ContactValues = {
  name: 'Ana Souza',
  phone: '(18) 99701-7249',
  email: 'ana@email.com',
  subject: '',
  message: 'Fui demitida sem receber as verbas.',
  consent: true,
};
const empty: ContactValues = {
  name: '',
  phone: '',
  email: '',
  subject: '',
  message: '',
  consent: false,
};

describe('validateContact', () => {
  test('formulário completo passa', () => {
    expect(validateContact(valid)).toEqual([]);
  });

  test('formulário vazio aponta os obrigatórios na ordem da página', () => {
    expect(validateContact(empty)).toEqual(['name', 'phone', 'message', 'consent']);
  });

  test('com tudo inválido, os campos saem na ordem do formulário (o primeiro recebe o foco)', () => {
    expect(validateContact({ ...empty, email: 'ana@x' })).toEqual([
      'name',
      'phone',
      'email',
      'message',
      'consent',
    ]);
  });

  test('nome só com espaços não conta', () => {
    expect(validateContact({ ...valid, name: '   ' })).toEqual(['name']);
  });

  test('telefone precisa de pelo menos 10 dígitos (DDD + número)', () => {
    expect(validateContact({ ...valid, phone: '(18) 9970-172' })).toEqual(['phone']);
    expect(validateContact({ ...valid, phone: '(18) 3456-7890' })).toEqual([]);
  });

  test('e-mail sem domínio completo é recusado', () => {
    expect(validateContact({ ...valid, email: 'ana@x' })).toEqual(['email']);
  });

  test('e-mail é opcional', () => {
    expect(validateContact({ ...valid, email: '' })).toEqual([]);
    expect(validateContact({ ...valid, email: '   ' })).toEqual([]);
  });

  test('mensagem só com espaços não conta', () => {
    expect(validateContact({ ...valid, message: ' \n ' })).toEqual(['message']);
  });

  test('sem consentimento não envia', () => {
    expect(validateContact({ ...valid, consent: false })).toEqual(['consent']);
  });
});
