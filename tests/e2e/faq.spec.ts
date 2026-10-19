import { test, expect } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

const QUESTIONS = [
  'Como funciona a primeira conversa?',
  'O atendimento pode ser totalmente online?',
  'Quais documentos devo separar?',
  'Como são definidos os honorários?',
  'O que eu contar fica em sigilo?',
] as const;
const FIRST_ANSWER = 'É o momento de entender a sua situação';
const SECOND_ANSWER = 'Sim. Reuniões podem ser feitas por videochamada';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('a primeira pergunta começa aberta e as outras fechadas', async ({ page }) => {
  await expect(page.getByRole('button', { name: QUESTIONS[0] })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  for (const name of QUESTIONS.slice(1)) {
    await expect(page.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'false');
  }
  await expect(page.getByText(FIRST_ANSWER)).toBeVisible();
  await expect(page.getByText(SECOND_ANSWER)).toBeHidden();
});

test('abrir uma pergunta não fecha as outras', async ({ page }) => {
  const second = page.getByRole('button', { name: QUESTIONS[1] });
  await second.click();
  await expect(second).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText(SECOND_ANSWER)).toBeVisible();
  await expect(page.getByRole('button', { name: QUESTIONS[0] })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await expect(page.getByText(FIRST_ANSWER)).toBeVisible();
});

test('clicar de novo fecha a pergunta', async ({ page }) => {
  const first = page.getByRole('button', { name: QUESTIONS[0] });
  await first.click();
  await expect(first).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText(FIRST_ANSWER)).toBeHidden();
});

test('na impressão todas as respostas aparecem', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  for (const answer of [
    FIRST_ANSWER,
    SECOND_ANSWER,
    'Documento de identidade, comprovante de residência',
    'Consideram a complexidade e a duração estimada do caso',
    'Sim. O sigilo profissional é um dever do advogado',
  ]) {
    await expect(page.getByText(answer)).toBeVisible();
  }
});
