import { test, expect, WA, wa, EMAIL, MESSAGES, expectExternalLink } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

/** Nome de cada área e o assunto que ela põe na mensagem. */
const AREAS = [
  ['Família Internacional', 'família internacional'],
  ['Vistos Americanos', 'vistos americanos'],
  ['Previdenciário', 'direito previdenciário'],
  ['Consumidor', 'direito do consumidor'],
] as const;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('CTAs padrão abrem o WhatsApp com a mensagem para o especialista', async ({ page }) => {
  // Literal derivado à mão: garante a codificação; a comparação com wa() amarra o literal ao
  // MESSAGES.default.
  const expected =
    'https://wa.me/5518997017246?text=Ol%C3%A1!%20Gostaria%20de%20falar%20com%20um%20especialista.';
  expect(expected).toBe(wa(MESSAGES.default));
  const ctas = [
    page.locator('[data-header]').getByRole('link', {
      name: 'Fale com um especialista pelo WhatsApp (abre em outra aba)',
      exact: true,
    }),
    page.locator('[data-wa-cta]'),
    page.locator('#contato').getByRole('link', {
      name: 'Conversar pelo WhatsApp (abre em outra aba)',
      exact: true,
    }),
    // O menu do celular fica fechado (inert, e display:none a 1440px): includeHidden acha o link,
    // e expectExternalLink só lê atributos.
    page.locator('[data-menu]').getByRole('link', {
      name: 'Fale com um especialista pelo WhatsApp (abre em outra aba)',
      exact: true,
      includeHidden: true,
    }),
    page.locator('[data-fab]'),
  ];
  for (const cta of ctas) await expectExternalLink(cta, expected);
});

test('cada área abre o WhatsApp com o assunto da área', async ({ page }) => {
  const section = page.locator('#atuacao');
  for (const [name, subject] of AREAS) {
    const link = section.getByRole('link', { name: new RegExp(`^${name} `) });
    await expectExternalLink(link, wa(MESSAGES.topic(subject)));
  }
});

test('os links que abrem o WhatsApp dizem isso no nome, e não só no ícone', async ({ page }) => {
  // mata: o "pelo WhatsApp" (sr-only) fora do header, da chamada do hero ou das áreas
  const cta = page.locator('[data-wa-cta]');
  await expect(cta).toHaveAccessibleName(
    'Fale com um especialista pelo WhatsApp (abre em outra aba)',
  );
  for (const [name] of AREAS) {
    await expect(
      page.locator('#atuacao').getByRole('link', { name: new RegExp(`^${name} `) }),
    ).toHaveAccessibleName(/ Conversar pelo WhatsApp \(abre em outra aba\)$/);
  }
  // O seletor de tema reescreve o rótulo da chamada: o destino continua no nome.
  await page.locator('label[for="tema-consumidor"]').click();
  await expect(cta).toHaveAccessibleName('Fale sobre consumo pelo WhatsApp (abre em outra aba)');
});

test('o caso não listado tem mensagem própria', async ({ page }) => {
  const link = page.getByRole('link', {
    name: 'Envie uma mensagem pelo WhatsApp (abre em outra aba)',
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
      .getByRole('link', { name: '(18) 99701-7246 (abre em outra aba)', exact: true }),
    WA,
  );
  await expectExternalLink(
    page.locator('footer').getByRole('link', {
      name: 'WhatsApp (18) 99701-7246 (abre em outra aba)',
      exact: true,
    }),
    WA,
  );
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

  test('no contato, a linha toda do WhatsApp e do e-mail é o alvo do link', async ({ page }) => {
    // mata: o a.cl-value::after do Contato.astro: só o texto era o alvo, com 25 px de altura, e o
    // ícone de 44 px ao lado não respondia ao toque
    const rows = await page.locator('#contato .contact-list li').evaluateAll((items) =>
      items.map((item) => {
        item.scrollIntoView({ block: 'center' });
        const icon = item.querySelector('.cl-icon')?.getBoundingClientRect();
        const hit =
          icon && document.elementFromPoint(icon.x + icon.width / 2, icon.y + icon.height / 2);
        return {
          height: Math.round(item.getBoundingClientRect().height),
          link: hit?.closest('a')?.getAttribute('href') ?? null,
        };
      }),
    );
    // O Horário não tem link e não vira alvo.
    expect(rows.map(({ link }) => link)).toEqual([WA, `mailto:${EMAIL}`, null]);
    for (const { height } of rows.slice(0, 2)) expect(height).toBeGreaterThanOrEqual(44);
  });
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
