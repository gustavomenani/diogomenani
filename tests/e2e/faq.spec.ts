import { test, expect, type Locator } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

const QUESTIONS = [
  'Como funciona a primeira conversa?',
  'O atendimento pode ser totalmente online?',
  'Quais documentos devo separar?',
  'Como são definidos os honorários?',
  'O que eu contar fica em sigilo?',
] as const;
const FIRST_ANSWER = 'É o momento de entender a sua situação';
const SECOND_ANSWER = 'Sim, o atendimento é somente online.';

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

test('com o mouse em cima, a pergunta clareia, aberta ou fechada', async ({ page }) => {
  // mata: o hover só no anel do ícone (Duvidas.astro): na pergunta aberta, que já tem o anel royal,
  // nada mudava, e na fechada mudava 1 px de anel
  const bright = 'rgb(36, 64, 230)';
  for (const name of [QUESTIONS[1], QUESTIONS[0]]) {
    const button = page.getByRole('button', { name });
    await button.hover();
    await expect(button.locator('.faq-question'), name).toHaveCSS('color', bright);
  }
  // Na aberta (a primeira), o círculo royal cheio clareia também.
  await expect(page.getByRole('button', { name: QUESTIONS[0] }).locator('.faq-icon')).toHaveCSS(
    'background-color',
    bright,
  );
});

test('na impressão todas as respostas aparecem', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  for (const answer of [
    FIRST_ANSWER,
    SECOND_ANSWER,
    'Documento de identidade, comprovante de residência',
    'Consideramos a complexidade e a duração estimada do caso',
    'Sim. O sigilo profissional é um dever do advogado',
  ]) {
    await expect(page.getByText(answer)).toBeVisible();
    // toBeVisible ignora opacidade: no papel, a resposta precisa estar opaca.
    await expect(page.getByText(answer)).toHaveCSS('opacity', '1');
  }
});

/** Borda direita do conteúdo (sem o padding) e borda direita da caixa do elemento. */
const rightEdges = (element: Locator) =>
  element.evaluate((node) => {
    const right = node.getBoundingClientRect().right;
    return { content: right - parseFloat(getComputedStyle(node).paddingRight), box: right };
  });

for (const width of [320, 360, 390]) {
  test(`a ${width} px, a resposta usa a largura toda da coluna`, async ({ page }) => {
    // mata: o recuo de 62 px à direita da resposta no celular (Duvidas.astro): o ícone fica na
    // linha da pergunta, e o recuo só estreitava a coluna (258 px a 360)
    await page.setViewportSize({ width, height: 800 });
    const answer = await rightEdges(page.getByText(FIRST_ANSWER));
    const question = await rightEdges(page.getByRole('button', { name: QUESTIONS[0] }));
    expect(answer.content).toBeCloseTo(question.box, 0);
  });
}

test('a partir de 640 px, a resposta termina antes da coluna do ícone', async ({ page }) => {
  // O ícone (38) mais o espaço (24): a resposta acaba na borda do texto da pergunta acima.
  await page.setViewportSize({ width: 640, height: 800 });
  const answer = await rightEdges(page.getByText(FIRST_ANSWER));
  const question = await rightEdges(page.getByRole('button', { name: QUESTIONS[0] }));
  expect(answer.content).toBeLessThanOrEqual(question.box - 62 + 0.5);
});

test.describe('impressão com movimento', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('na impressão, as respostas fechadas aparecem na hora, sem transição', async ({ page }) => {
    const answer = page.getByText(SECOND_ANSWER);
    await page.emulateMedia({ media: 'print' });
    expect(
      await answer.evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.visibility, style.opacity];
      }),
    ).toEqual(['visible', '1']);
  });
});

test('as respostas não viram regiões, e cada botão controla a própria resposta', async ({
  page,
}) => {
  // Cinco landmarks "região" poluiriam a navegação por regiões do leitor de tela.
  await expect(page.locator('#duvidas').getByRole('region')).toHaveCount(0);
  const pairs = [
    [QUESTIONS[0], FIRST_ANSWER],
    [QUESTIONS[1], SECOND_ANSWER],
  ] as const;
  for (const [question, answer] of pairs) {
    const button = page.getByRole('button', { name: question });
    const id = await button.evaluate((element) => element.getAttribute('aria-controls') ?? '');
    const panel = page.locator(`[id="${id}"]`);
    await expect(panel).toHaveCount(1);
    await expect(panel).toContainText(answer);
  }
  const second = page.getByRole('button', { name: QUESTIONS[1] });
  const id = await second.evaluate((element) => element.getAttribute('aria-controls') ?? '');
  const answer = page.locator(`[id="${id}"]`).getByText(SECOND_ANSWER);
  await expect(answer).toBeHidden();
  await second.click();
  await expect(answer).toBeVisible();
});
