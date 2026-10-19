import { describe, expect, test } from 'vitest';
import { buildContactMessage, messages, waLink } from './whatsapp';

describe('waLink', () => {
  test('sem texto aponta para a conversa do escritório', () => {
    expect(waLink()).toBe('https://wa.me/5518997017249');
  });

  test('com texto envia a mensagem codificada para a URL', () => {
    expect(waLink(messages.default)).toBe(
      'https://wa.me/5518997017249?text=Ol%C3%A1%2C%20Dr.%20Diogo!%20Gostaria%20de%20agendar%20uma%20conversa.',
    );
  });
});

describe('messages', () => {
  test('o tema escolhido entra na mensagem de agendamento', () => {
    expect(messages.topic('Direito do Consumidor')).toBe(
      'Olá, Dr. Diogo! Gostaria de agendar uma conversa sobre Direito do Consumidor.',
    );
  });

  test('a área escolhida entra na mensagem de conversa', () => {
    expect(messages.area('Direito Imobiliário')).toBe(
      'Olá, Dr. Diogo! Gostaria de conversar sobre Direito Imobiliário.',
    );
  });
});

describe('buildContactMessage', () => {
  test('monta a mensagem completa, sem os espaços digitados nas pontas', () => {
    expect(
      buildContactMessage({
        name: ' Ana ',
        phone: '(18) 99701-7249',
        email: ' ana@x.com ',
        subject: 'Direito do Trabalho',
        message: ' Fui demitida. ',
      }),
    ).toBe(
      'Olá, Dr. Diogo! Meu nome é Ana. Assunto: Direito do Trabalho. Fui demitida. (WhatsApp: (18) 99701-7249, e-mail: ana@x.com)',
    );
  });

  test('omite assunto e e-mail quando não foram informados', () => {
    expect(
      buildContactMessage({
        name: 'Ana',
        phone: '(18) 99701-7249',
        email: '',
        subject: '',
        message: 'Fui demitida.',
      }),
    ).toBe('Olá, Dr. Diogo! Meu nome é Ana. Fui demitida. (WhatsApp: (18) 99701-7249)');
  });

  test('e-mail só com espaços conta como não informado', () => {
    expect(
      buildContactMessage({
        name: 'Ana',
        phone: '(18) 99701-7249',
        email: '   ',
        subject: '',
        message: 'Oi.',
      }),
    ).toBe('Olá, Dr. Diogo! Meu nome é Ana. Oi. (WhatsApp: (18) 99701-7249)');
  });
});
