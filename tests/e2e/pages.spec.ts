import { whatsapp } from '../../src/data/contact';
import {
  test,
  expect,
  axeViolations,
  expectExternalLink,
  EMAIL,
  OAB,
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

const PAGES = [
  { name: 'aviso de privacidade', path: '/privacidade/' },
  { name: '404', path: '/nao-existe' },
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
    expect(terms).toEqual(['nowrap', 'nowrap', 'nowrap', 'nowrap']);
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
    test(`${label} leva ao início, também depois de voltar pelo rodapé`, async ({ page }) => {
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

for (const { name, path } of PAGES) {
  test.describe(name, () => {
    test('sem erro de script, sem requisição a terceiros e sem o módulo da página', async ({
      page,
    }) => {
      const { errors, thirdParty } = await load(page, path);
      expect(errors).toEqual([]);
      expect(thirdParty).toEqual([]);
      // Além do JSON-LD, se houver, nenhum script: nem o inline de movimento nem o módulo da
      // página.
      await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
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

test('usar a página não grava cookie nem nada no navegador', async ({ page }) => {
  await page.goto('/');
  await page.locator('label[for="tema-consumidor"]').click();
  await expect(page.locator('[data-wa-cta] [data-wa-label]')).toHaveText('Fale sobre consumo');
  await page.getByRole('button', { name: 'O atendimento pode ser totalmente online?' }).click();
  expect(
    await page.evaluate(() => ({ cookie: document.cookie, storage: localStorage.length })),
  ).toEqual({ cookie: '', storage: 0 });
});
