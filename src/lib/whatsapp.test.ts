import { describe, expect, test } from 'vitest';
import { buildContactMessage, messages, waLink } from './whatsapp';

describe('waLink', () => {
  test('sem texto aponta para a conversa do escritório', () => {
    expect(waLink()).toBe('https://wa.me/5518997017246');
  });

  test('um caractere inválido (metade de um emoji) vira � em vez de travar o link', () => {
    expect(waLink('Oi \uD83D')).toBe('https://wa.me/5518997017246?text=Oi%20%EF%BF%BD');
  });

  test('com texto envia a mensagem codificada para a URL', () => {
    expect(waLink(messages.default)).toBe(
      'https://wa.me/5518997017246?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista.',
    );
  });
});

describe('messages', () => {
  test('o assunto da área entra na mensagem para o especialista', () => {
    expect(messages.topic('vistos americanos')).toBe(
      'Olá! Gostaria de falar com um especialista sobre vistos americanos.',
    );
  });

  test('nenhuma mensagem fala em agendar consulta', () => {
    const texts = [messages.default, messages.topic('consumo'), messages.unlistedCase];
    for (const text of texts) expect(text).not.toMatch(/agend|consulta/i);
  });
});

describe('buildContactMessage', () => {
  test('monta a mensagem completa, sem os espaços digitados nas pontas', () => {
    expect(
      buildContactMessage({
        name: ' Ana ',
        phone: '(18) 99701-7249',
        email: ' ana@x.com ',
        subject: 'Previdenciário',
        message: ' Fui demitida. ',
      }),
    ).toBe(
      'Olá! Meu nome é Ana. Assunto: Previdenciário. Fui demitida. (WhatsApp: (18) 99701-7249, e-mail: ana@x.com)',
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
    ).toBe('Olá! Meu nome é Ana. Fui demitida. (WhatsApp: (18) 99701-7249)');
  });

  test('nome terminado em ponto não ganha ponto duplicado', () => {
    expect(
      buildContactMessage({
        name: 'Ana S.',
        phone: '(18) 99701-7249',
        email: '',
        subject: '',
        message: 'Oi.',
      }),
    ).toBe('Olá! Meu nome é Ana S. Oi. (WhatsApp: (18) 99701-7249)');
  });

  test('relato sem pontuação final ganha ponto antes dos dados de contato', () => {
    expect(
      buildContactMessage({
        name: 'Ana Souza',
        phone: '(18) 99701-7249',
        email: '',
        subject: 'Vistos Americanos',
        message: 'Tive meu visto negado',
      }),
    ).toBe(
      'Olá! Meu nome é Ana Souza. Assunto: Vistos Americanos. Tive meu visto negado. (WhatsApp: (18) 99701-7249)',
    );
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
    ).toBe('Olá! Meu nome é Ana. Oi. (WhatsApp: (18) 99701-7249)');
  });
});
