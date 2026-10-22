import { expect, test } from 'vitest';
import { privacySections } from './privacy';

/** O aviso inteiro, parágrafos e itens de lista, como texto corrido. */
const fullText = privacySections.flatMap(({ paragraphs }) => paragraphs.flat()).join('\n');

test('o aviso não descreve um gesto de tela de toque, que no computador não existe', () => {
  // mata: "quando você tocar em enviar dentro do WhatsApp" (no computador, com o WhatsApp Web ou o
  // app de desktop, se clica)
  expect(fullText).not.toMatch(/\b(tocar|toque|toca)\b/i);
  expect(fullText).toContain(
    'ele só chega ao escritório quando você enviar a mensagem no WhatsApp.',
  );
});
