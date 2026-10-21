import { contact, whatsapp } from '../../src/data/contact';
import { test, expect, axeViolations, expectExternalLink, WA, type Page } from './fixtures';

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
  { name: 'aviso de privacidade', path: '/privacidade' },
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
    const { status } = await load(page, '/privacidade');
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
    await page.goto('/privacidade');
    const main = page.getByRole('main');
    const phone = main.getByRole('link', { name: whatsapp.display });
    await expectExternalLink(phone, WA);
    // O número não quebra no hífen: "(18) 99701-" numa linha e "7249" na outra.
    expect(
      await phone.evaluate((link) => {
        const style = getComputedStyle(link);
        return style.textWrapMode === 'nowrap' || style.whiteSpace === 'nowrap';
      }),
    ).toBe(true);
    await expect(
      main.getByRole('link', { name: contact.email.label, exact: true }),
    ).toHaveAttribute('href', contact.email.href);
  });

  test('"e-mail" não quebra no hífen', async ({ page }) => {
    await page.goto('/privacidade');
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

  test('o cabeçalho e o rodapé levam de volta ao site', async ({ page }) => {
    await page.goto('/privacidade');
    const banner = page.getByRole('banner');
    await expect(banner.getByRole('link', { name: 'Voltar ao site', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(banner.getByRole('link', { name: 'Diogo Menani', exact: true })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Aviso de privacidade' }),
    ).toHaveAttribute('href', '/privacidade');
  });

  test('na impressão, o cabeçalho sai', async ({ page }) => {
    await page.goto('/privacidade');
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('fica aberto aos buscadores (sem noindex)', async ({ page }) => {
    await page.goto('/privacidade');
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
      // Só o JSON-LD, se houver: nem o script inline de movimento nem o módulo da página.
      await expect(page.locator('script:not([type="application/ld+json"])')).toHaveCount(0);
      await expect(page.locator('[data-page]')).toHaveAttribute('data-motion', 'pending');
      // O skip link tem destino.
      await expect(page.locator('main#conteudo')).toHaveCount(1);
    });

    test('axe sem violações', async ({ page }) => {
      await page.goto(path);
      expect(await axeViolations(page)).toEqual([]);
    });
  });
}

test('enviar o formulário não grava cookie nem nada no navegador', async ({ page, openedUrls }) => {
  await page.goto('/');
  await page.getByLabel('Nome', { exact: true }).fill('Ana Souza');
  await page.getByLabel('WhatsApp', { exact: true }).fill('18997017249');
  await page.getByLabel('Mensagem', { exact: true }).fill('Fui demitida sem receber as verbas.');
  await page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }).check();
  await page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }).click();
  await expect.poll(openedUrls).toHaveLength(1);
  expect(
    await page.evaluate(() => ({ cookie: document.cookie, storage: localStorage.length })),
  ).toEqual({ cookie: '', storage: 0 });
});
