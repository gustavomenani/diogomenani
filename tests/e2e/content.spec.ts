import { test, expect, EMAIL, OAB } from './fixtures';

// Textos e dados aprovados pelo cliente, copiados à mão: comparada com ela mesma, a fonte
// (src/data/*) passaria com qualquer valor, e a regressão visual, que também os veria, fica fora
// do CI. O texto não depende do motor: roda só no Chromium.
test.skip(({ browserName }) => browserName !== 'chromium', 'o texto é o mesmo em todo motor');

test.describe('página inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('o hero tem o título e o texto de apoio aprovados', async ({ page }) => {
    await expect(page.locator('#inicio .hero-title .sr-only')).toHaveText(
      'Defesa dos seus direitos com ética e responsabilidade',
    );
    await expect(page.locator('#inicio .hero-lead')).toHaveText(
      'Assessoria jurídica completa para Vistos Americanos, família internacional, previdenciário e consumidor.',
    );
  });

  test('as chamadas têm os rótulos aprovados', async ({ page }) => {
    await expect(page.locator('[data-header] .btn-header')).toHaveText(/^Fale conosco/);
    await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText(
      'Fale com o Dr. Diogo Menani',
    );
  });

  test('o Sobre traz o nome, a profissão e a inscrição na OAB', async ({ page }) => {
    await expect(page.locator('#sobre h2')).toHaveText(
      'Diogo Menani - Advogado no Brasil inscrito na OAB/SP 546.508',
    );
  });

  test('a inscrição na OAB e o atendimento só online aparecem no hero; a OAB, também no rodapé', async ({
    page,
  }) => {
    await expect(page.locator('#inicio .facts li')).toHaveText([OAB, 'Atendimento somente online']);
    await expect(page.getByRole('contentinfo')).toContainText(OAB);
  });

  test('"Como trabalhamos" tem o texto aprovado', async ({ page }) => {
    await expect(page.locator('#como-trabalhamos .lede')).toHaveText(
      'Cada cliente recebe orientação jurídica de forma clara, estratégias bem definidas e atualizações sobre seu caso, com transparência do início ao fim.',
    );
  });

  test('as etapas são numeradas de "Etapa 01" a "Etapa 04"', async ({ page }) => {
    // O espaço entre "Etapa" e o número vem do gap do flex: no texto eles ficam colados.
    await expect(page.locator('#como-trabalhamos .step-num')).toHaveText([
      /^Etapa\s*01$/,
      /^Etapa\s*02$/,
      /^Etapa\s*03$/,
      /^Etapa\s*04$/,
    ]);
  });

  test('as áreas, em ordem alfabética, têm os números 01–04, os nomes e as descrições aprovados', async ({
    page,
  }) => {
    const section = page.locator('#atuacao');
    await expect(section.locator('.area-num')).toHaveText(['01', '02', '03', '04']);
    await expect(section.locator('.area-name')).toHaveText([
      'Consumidor',
      'Família Internacional',
      'Previdenciário',
      'Vistos Americanos',
    ]);
    await expect(section.locator('.area-desc')).toHaveText([
      'Direito do passageiro aéreo.',
      'Questões de família que envolvem mais de um país.',
      'Salário-maternidade, BPC/LOAS, auxílio-acidente, aposentadorias e demais áreas previdenciárias.',
      'B1/B2 (turismo), F1 (estudantes) e J1 (programas de intercâmbio específicos).',
    ]);
  });

  test('o contato tem o título aprovado e não tem formulário', async ({ page }) => {
    await expect(page.locator('#contact-title')).toHaveText('Fale conosco');
    await expect(page.locator('#contato form')).toHaveCount(0);
  });

  test('as redes são só as do escritório: Instagram, TikTok e Facebook', async ({ page }) => {
    const footer = page.getByRole('contentinfo');
    const hrefs = await footer
      .locator('a[href*="instagram.com"], a[href*="tiktok.com"], a[href*="facebook.com"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    expect(hrefs).toEqual([
      'https://www.instagram.com/menani.advocacia/',
      'https://www.tiktok.com/@menani.advocacia',
      'https://www.facebook.com/menani.advocacia/',
    ]);
    await expect(page.locator('a[href*="diogomenani" i]:not([href^="mailto:"])')).toHaveCount(0);
  });

  test('o contato do rodapé traz o endereço do site, sem www, abaixo do e-mail', async ({
    page,
  }) => {
    const links = page.getByRole('contentinfo').locator('.footer-col').nth(1).getByRole('link');
    await expect(links.nth(1)).toHaveText(EMAIL);
    await expect(links.nth(2)).toHaveText('menaniadvocacia.com.br');
    await expect(links.nth(2)).toHaveAttribute('href', 'https://menaniadvocacia.com.br/');
  });
});

/** Proibido no texto do site: nada de "agende/agendar consulta" (pedido do cliente). */
const SCHEDULING = /\bagend|\bconsulta\b/i;

for (const { path, hasEmail } of [
  { path: '/', hasEmail: true },
  { path: '/privacidade/', hasEmail: true },
  { path: '/nao-existe', hasEmail: false },
]) {
  test.describe(path, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(path);
    });

    test('todo link de e-mail vai para o do escritório, e não há LinkedIn', async ({ page }) => {
      const hrefs = await page
        .locator('a[href^="mailto:"]')
        .evaluateAll((links) => links.map((link) => link.getAttribute('href')));
      expect(hrefs.length > 0, 'tem link de e-mail').toBe(hasEmail);
      expect(hrefs.filter((href) => href !== `mailto:${EMAIL}`)).toEqual([]);
      // O LinkedIn saiu a pedido do cliente (I72).
      await expect(page.locator('a[href*="linkedin" i]')).toHaveCount(0);
    });

    test('nenhum texto fala em agendar nem em consulta', async ({ page }) => {
      // Todo o texto, inclusive o escondido agora (respostas fechadas do FAQ, menu fechado), o
      // JSON-LD, as metas que os buscadores e as redes mostram, os atributos que o visitante lê ou
      // ouve e as mensagens prontas do WhatsApp: texto novo fora dos nós de texto também conta.
      const texts = await page.evaluate(() => {
        const found: string[] = [];
        const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const code = node.parentElement?.closest(
            'script:not([type="application/ld+json"]), style',
          );
          if (!code) found.push(node.textContent ?? '');
        }
        for (const meta of document.querySelectorAll('meta[content]')) {
          found.push(meta.getAttribute('content') ?? '');
        }
        // Texto que não é nó de texto, mas o visitante vê ou ouve: rótulos acessíveis, dicas dos
        // campos, o rótulo que o botão ganha ao escolher um tema e a mensagem pronta do WhatsApp
        // (a de cada área e a de cada tema, no href e no data-href).
        for (const attr of ['aria-label', 'placeholder', 'alt', 'title', 'data-cta']) {
          for (const element of document.querySelectorAll(`[${attr}]`)) {
            found.push(element.getAttribute(attr) ?? '');
          }
        }
        for (const attr of ['href', 'data-href']) {
          for (const link of document.querySelectorAll(`[${attr}^="https://wa.me/"]`)) {
            const url = new URL(link.getAttribute(attr) ?? '');
            found.push(url.searchParams.get('text') ?? '');
          }
        }
        return found;
      });
      expect(texts.length).toBeGreaterThan(10);
      expect(texts.filter((text) => SCHEDULING.test(text))).toEqual([]);
    });
  });
}
