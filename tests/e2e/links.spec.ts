import { test, expect, WA, wa, MESSAGES, expectExternalLink } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

const AREAS = [
  'Família e Sucessões',
  'Direito do Consumidor',
  'Contratos e Direito Civil',
  'Direito do Trabalho',
  'Direito Imobiliário',
  'Assessoria para Empresas',
];

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('CTAs padrão abrem o WhatsApp com a mensagem de agendamento', async ({ page }) => {
  // Literal derivado à mão: garante a codificação sem depender do helper wa().
  const expected =
    'https://wa.me/5518997017249?text=Ol%C3%A1%2C%20Dr.%20Diogo!%20Gostaria%20de%20agendar%20uma%20conversa.';
  const ctas = [
    page
      .locator('[data-header]')
      .getByRole('link', { name: 'Agendar conversa (abre em outra aba)', exact: true }),
    page.locator('[data-wa-cta]'),
    page.locator('#contato').getByRole('link', {
      name: 'Conversar pelo WhatsApp (abre em outra aba)',
      exact: true,
    }),
    page.locator('[data-fab]'),
  ];
  for (const cta of ctas) await expectExternalLink(cta, expected);
});

test('cada área abre o WhatsApp com o nome da área', async ({ page }) => {
  const section = page.locator('#atuacao');
  for (const area of AREAS) {
    const link = section.getByRole('link', { name: new RegExp(`^${area} `) });
    await expectExternalLink(link, wa(MESSAGES.area(area)));
  }
});

test('o caso não listado tem mensagem própria', async ({ page }) => {
  const link = page.getByRole('link', {
    name: 'Envie uma mensagem (abre em outra aba)',
    exact: true,
  });
  await expectExternalLink(link, wa(MESSAGES.unlistedCase));
});

test('todo link interno aponta para uma seção que existe', async ({ page }) => {
  const targets = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')].map((a) => a.hash.slice(1)),
  );
  expect(targets.length).toBeGreaterThan(10);
  const missing = await page.evaluate(
    (ids) => ids.filter((id) => !document.getElementById(id)),
    targets,
  );
  expect(missing).toEqual([]);
});

test('contato e rodapé usam o link sem texto', async ({ page }) => {
  await expectExternalLink(
    page
      .locator('#contato')
      .getByRole('link', { name: '(18) 99701-7249 (abre em outra aba)', exact: true }),
    WA,
  );
  await expectExternalLink(
    page.locator('footer').getByRole('link', {
      name: 'WhatsApp (18) 99701-7249 (abre em outra aba)',
      exact: true,
    }),
    WA,
  );
});

test('todo link que abre em outra aba tem rel com noopener', async ({ page }) => {
  // mata: rede social do rodapé com target="_blank" escrito à mão, sem o externalLink()
  const links = await page.locator('a[target="_blank"]').evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      href: anchor.getAttribute('href'),
      rel: anchor.getAttribute('rel') ?? '',
    })),
  );
  expect(links.length).toBeGreaterThan(10);
  expect(links.filter(({ rel }) => !rel.split(/\s+/).includes('noopener'))).toEqual([]);
});
