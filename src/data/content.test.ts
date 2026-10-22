import { expect, test } from 'vitest';
import { contact } from './contact';
import { areas, commitments, faq } from './content';

test('cada área tem um id único (os temas do seletor viram ids no HTML)', () => {
  const ids = areas.map((area) => area.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test('o assunto de cada área continua a frase da mensagem (começa em minúscula)', () => {
  for (const area of areas) expect(area.subject).toMatch(/^[a-zà-ú]/);
});

test('a resposta sobre honorários cita a seccional da OAB do contato', () => {
  const honorarios = faq.find((item) => item.question === 'Como são definidos os honorários?');
  expect(honorarios?.answer).toContain(`OAB/${contact.oabState}`);
});

test('o atendimento online não promete um envio de documentos que o site não oferece', () => {
  const online = commitments.find((item) => item.term === 'Atendimento online');
  expect(online?.text).toBe(
    'Reuniões por videochamada e envio de documentos pelo WhatsApp, sem precisar sair de casa.',
  );
});
