import { whatsapp } from '../../src/data/contact';
import {
  test,
  expect,
  axeViolations,
  expectExternalLink,
  EMAIL,
  OAB,
  SUBMIT,
  WA,
  type Locator,
  type Page,
} from './fixtures';

// Páginas secundárias (aviso de privacidade e 404): sem o módulo da página, tudo aparece de saída.

const PRIVACY_SECTIONS = [
  'Quem é o responsável',
  'O que o site coleta',
  'Para que os dados são usados',
  'WhatsApp',
  'Por quanto tempo',
  'Seus direitos',
] as const;

/**
 * Os scripts inline de cada página, por um trecho do código: o aviso tem só o da volta ao site
 * (privacidade.astro), e a 404, nenhum.
 */
const PAGES = [
  { name: 'aviso de privacidade', path: '/privacidade/', inlineScripts: ['data-back-to-site'] },
  { name: '404', path: '/nao-existe', inlineScripts: [] },
] as const;

/** Erros de script e requisições a outras origens enquanto a página carrega. */
async function load(page: Page, path: string) {
  const errors: string[] = [];
  const requested: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => requested.push(request.url()));
  const response = await page.goto(path);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const origin = new URL(page.url()).origin;
  const thirdParty = requested.filter(
    (url) => !url.startsWith('data:') && new URL(url).origin !== origin,
  );
  return { status: response?.status(), errors, thirdParty };
}

/** Altura e meio vertical do elemento na tela. */
const boxOf = (locator: Locator) =>
  locator.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { height: rect.height, middle: rect.top + rect.height / 2 };
  });

/** Elementos da página com opacidade zero: `toBeVisible` não os enxerga. */
function transparentElements(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.body.querySelectorAll('*')]
      .filter((element) => getComputedStyle(element).opacity === '0')
      .map((element) => element.outerHTML.slice(0, 80)),
  );
}

test.describe('aviso de privacidade', () => {
  test('mostra o aviso inteiro, com os links para o WhatsApp e a ANPD', async ({ page }) => {
    const { status } = await load(page, '/privacidade/');
    expect(status).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Aviso de privacidade', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 2 })).toHaveText([...PRIVACY_SECTIONS]);
    await expect(
      page.getByText('Como o site de Diogo Menani trata os dados de quem entra em contato.'),
    ).toBeVisible();

    const whatsapp = page.getByRole('link', { name: /^política de privacidade do WhatsApp/ });
    await expect(whatsapp).toHaveAttribute('href', 'https://www.whatsapp.com/legal/privacy-policy');
    await expect(whatsapp).toHaveAttribute('target', '_blank');
    const anpd = page.getByRole('link', {
      name: /^Autoridade Nacional de Proteção de Dados \(ANPD\)/,
    });
    await expect(anpd).toHaveAttribute('href', 'https://www.gov.br/anpd');
    await expect(anpd).toHaveAttribute('target', '_blank');

    expect(await transparentElements(page)).toEqual([]);
  });

  test('o WhatsApp e o e-mail do responsável são links', async ({ page }) => {
    await page.goto('/privacidade/');
    const main = page.getByRole('main');
    const phone = main.getByRole('link', { name: whatsapp.display });
    await expectExternalLink(phone, WA);
    // O número não quebra no hífen: "(18) 99701-" numa linha e "7246" na outra.
    expect(
      await phone.evaluate((link) => {
        const style = getComputedStyle(link);
        return style.textWrapMode === 'nowrap' || style.whiteSpace === 'nowrap';
      }),
    ).toBe(true);
    const email = main.getByRole('link', { name: EMAIL, exact: true });
    await expect(email).toHaveAttribute('href', `mailto:${EMAIL}`);
    // O mailto abre o programa de e-mail, e não uma aba nova.
    await expect(email).not.toHaveAttribute('target');
  });

  test('"e-mail" não quebra no hífen', async ({ page }) => {
    await page.goto('/privacidade/');
    // Cada "e-mail" do texto, com o que o deixa sem quebra: nowrap nele ou num ancestral.
    const terms = await page.getByRole('main').evaluate((main) => {
      const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
      const found: string[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const count = node.textContent?.split('e-mail').length ?? 1;
        const parent = node.parentElement;
        const style = parent && getComputedStyle(parent);
        const nowrap = style?.textWrapMode === 'nowrap' || style?.whiteSpace === 'nowrap';
        for (let index = 1; index < count; index++) found.push(nowrap ? 'nowrap' : 'quebra');
      }
      return found;
    });
    expect(terms).toEqual(['nowrap', 'nowrap']);
  });

  test('a inscrição na OAB não quebra entre a sigla e o número', async ({ page }) => {
    await page.goto('/privacidade/');
    // Em 375–430 px, sem o nowrap, "OAB/SP" fica no fim de uma linha e o número na outra.
    const inscription = page.getByRole('main').getByText(OAB, { exact: true });
    await expect(inscription).toHaveCount(1);
    expect(
      await inscription.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.textWrapMode === 'nowrap' || style.whiteSpace === 'nowrap';
      }),
    ).toBe(true);
  });

  test('a referência da LGPD não quebra entre "Lei", "nº" e o número', async ({ page }) => {
    await page.goto('/privacidade/');
    // A 360 e a 390 px, sem o nowrap, "(Lei" fica no fim de uma linha e "nº 13.709/2018" na outra.
    const law = page.getByRole('main').getByText('Lei nº 13.709/2018', { exact: true });
    await expect(law).toHaveCount(1);
    expect(
      await law.evaluate((element) => {
        const style = getComputedStyle(element);
        return style.textWrapMode === 'nowrap' || style.whiteSpace === 'nowrap';
      }),
    ).toBe(true);
  });

  test('o cabeçalho e o rodapé levam de volta ao site', async ({ page }) => {
    await page.goto('/privacidade/');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'Voltar ao site', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(
      banner.getByRole('link', {
        name: 'Diogo Menani — Advocacia e Assessoria Jurídica',
        exact: true,
      }),
    ).toHaveAttribute('href', '/');
    // Com a barra: é a URL que o build gera (privacidade/index.html), sem redirecionamento.
    const footerLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Aviso de privacidade' });
    await expect(footerLink).toHaveAttribute('href', '/privacidade/');
    await expect(footerLink).toHaveAttribute('aria-current', 'page');
  });

  // Os dois links do cabeçalho levam ao site: o "Voltar ao site" e o logo.
  for (const { label, name } of [
    { label: '"Voltar ao site"', name: 'Voltar ao site' },
    { label: 'o logo', name: 'Diogo Menani — Advocacia e Assessoria Jurídica' },
  ]) {
    test(`aberto pelo formulário, ${label} fecha a aba e o que foi digitado continua lá`, async ({
      page,
    }) => {
      // mata: o script da volta ao site (privacidade.astro) e o gancho dele nos dois links do
      // SimpleHeader.astro: a aba do aviso ia para uma home nova, com os campos vazios, e o relato
      // ficava na outra aba
      await page.goto('/');
      const fields = [
        [page.getByLabel('Nome', { exact: true }), 'Ana Souza'],
        [page.getByLabel('Mensagem', { exact: true }), 'Fui demitida sem receber as verbas.'],
      ] as const;
      for (const [field, value] of fields) await field.fill(value);
      const opening = page.waitForEvent('popup');
      await page
        .getByRole('link', { name: 'aviso de privacidade (abre em outra aba)', exact: true })
        .click();
      const notice = await opening;
      await notice.waitForLoadState();
      expect(new URL(notice.url()).pathname).toBe('/privacidade/');
      const closing = notice.waitForEvent('close');
      // O Firefox fecha a aba antes de o clique terminar, e o Playwright acusa a página fechada.
      await notice
        .getByRole('banner')
        .getByRole('link', { name, exact: true })
        .click()
        .catch((error: unknown) => {
          if (!notice.isClosed()) throw error;
        });
      await closing;
      expect(notice.isClosed()).toBe(true);
      for (const [field, value] of fields) await expect(field).toHaveValue(value);
    });

    test(`aberto direto ou na mesma aba, ${label} é um link comum para o início`, async ({
      page,
    }) => {
      // Sem o referrer do site (direto) ou com mais de uma entrada no histórico (pelo rodapé, na
      // mesma aba), a aba não fecha: o link leva ao início.
      const pathname = () => new URL(page.url()).pathname;
      await page.goto('/privacidade/');
      const back = page.getByRole('banner').getByRole('link', { name, exact: true });
      await back.click();
      await expect.poll(pathname).toBe('/');
      await page
        .getByRole('contentinfo')
        .getByRole('link', { name: 'Privacidade', exact: true })
        .click();
      await expect.poll(pathname).toBe('/privacidade/');
      await back.click();
      await expect.poll(pathname).toBe('/');
    });
  }

  test('na impressão, o cabeçalho sai', async ({ page }) => {
    await page.goto('/privacidade/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('fica aberto aos buscadores (sem noindex)', async ({ page }) => {
    await page.goto('/privacidade/');
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  });
});

test.describe('404', () => {
  test('um endereço que não existe responde 404 e oferece o início e o WhatsApp', async ({
    page,
  }) => {
    const { status } = await load(page, '/nao-existe');
    expect(status).toBe(404);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Página não encontrada', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        'O endereço que você abriu não existe ou mudou de lugar. Volte ao início ou fale direto pelo WhatsApp.',
        { exact: true },
      ),
    ).toBeVisible();
    const main = page.getByRole('main');
    await expect(main.getByRole('link', { name: 'Ir para o início', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    const whatsapp = main.getByRole('link', { name: /^Conversar pelo WhatsApp/ });
    await expect(whatsapp).toHaveAttribute('href', new RegExp(`^${WA}`));
    await expect(whatsapp).toHaveAttribute('target', '_blank');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Aviso de privacidade' }),
    ).not.toHaveAttribute('aria-current');
    expect(await transparentElements(page)).toEqual([]);
  });
});

for (const { name, path, inlineScripts } of PAGES) {
  test.describe(name, () => {
    test('sem erro de script, sem requisição a terceiros e sem o módulo da página', async ({
      page,
    }) => {
      const { errors, thirdParty } = await load(page, path);
      expect(errors).toEqual([]);
      expect(thirdParty).toEqual([]);
      // Além do JSON-LD, se houver, só o script da volta ao site, no aviso: nem o script inline de
      // movimento nem o módulo da página. O código vem do textContent: o texto que o Playwright lê
      // deixa o conteúdo do <script> de fora.
      const scripts = page.locator('script:not([type="application/ld+json"])');
      expect(await scripts.evaluateAll((nodes) => nodes.map((node) => node.textContent))).toEqual(
        inlineScripts.map((code) => expect.stringContaining(code)),
      );
      await expect(page.locator('script[src], script[type="module"]')).toHaveCount(0);
      await expect(page.locator('[data-page]')).toHaveAttribute('data-motion', 'pending');
      // O skip link tem destino.
      await expect(page.locator('main#conteudo')).toHaveCount(1);
    });

    test('axe sem violações', async ({ page }) => {
      await page.goto(path);
      expect(await axeViolations(page)).toEqual([]);
    });

    test('no cabeçalho, só o logo compacto branco, sobre o royal', async ({ page }) => {
      // mata: tone="blue" no SimpleHeader (o logo azul some no fundo royal, e a geometria, o axe e
      // a suíte visual não percebem) ou o logo completo no lugar do compacto
      await page.goto(path);
      const banner = page.getByRole('banner');
      await expect(banner.locator('img')).toHaveCount(1);
      await expect(banner.locator('img[src="/logo-compact-white.svg"]')).toHaveCount(1);
    });

    test('no celular, a marca e a volta ao site ficam numa linha', async ({ page }) => {
      // mata: o logo de largura fixa no celular (220 px): a 360 px, a volta ao site descia para a
      // linha de baixo e o cabeçalho crescia 40 px
      for (const width of [320, 360, 390]) {
        await page.setViewportSize({ width, height: 740 });
        await page.goto(path);
        const banner = page.getByRole('banner');
        const [brand, back, bar] = await Promise.all([
          boxOf(banner.getByRole('link', { name: /^Diogo Menani/ })),
          boxOf(banner.getByRole('link', { name: 'Voltar ao site', exact: true })),
          boxOf(banner),
        ]);
        expect(Math.abs(brand.middle - back.middle), `${width} px`).toBeLessThan(4);
        // A volta ao site numa linha só, e o cabeçalho na altura de sempre (84 px).
        expect(back.height, `${width} px`).toBeLessThanOrEqual(44.5);
        expect(bar.height, `${width} px`).toBeLessThanOrEqual(85);
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          `${width} px`,
        ).toBeLessThanOrEqual(width);
      }
    });
  });
}

test('enviar o formulário não grava cookie nem nada no navegador', async ({ page, openedUrls }) => {
  await page.goto('/');
  await page.getByLabel('Nome', { exact: true }).fill('Ana Souza');
  await page.getByLabel('WhatsApp', { exact: true }).fill('18997017249');
  await page.getByLabel('Mensagem', { exact: true }).fill('Fui demitida sem receber as verbas.');
  await page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }).check();
  await page.getByRole('button', { name: SUBMIT, exact: true }).click();
  await expect.poll(openedUrls).toHaveLength(1);
  expect(
    await page.evaluate(() => ({ cookie: document.cookie, storage: localStorage.length })),
  ).toEqual({ cookie: '', storage: 0 });
});
