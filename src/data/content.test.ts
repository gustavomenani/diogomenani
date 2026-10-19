import { expect, test } from 'vitest';
import { contact } from './contact';
import { areas, credentials, faq } from './content';

test('cada área tem um id único (os temas do seletor viram ids no HTML)', () => {
  const ids = areas.map((area) => area.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('a credencial de atendimento usa a cidade do contato', () => {
  const atendimento = credentials.find((item) => item.term === 'Atendimento');
  expect(atendimento?.value).toContain(contact.city);
});

test('a resposta sobre honorários cita a seccional da OAB do contato', () => {
  const honorarios = faq.find((item) => item.question === 'Como são definidos os honorários?');
  expect(honorarios?.answer).toContain(`OAB/${contact.oabState}`);
});
