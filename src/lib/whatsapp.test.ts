import { describe, expect, test } from 'vitest';
import { messages, waLink } from './whatsapp';

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
