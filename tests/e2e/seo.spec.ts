import { site } from '../../src/data/site';
import { test, expect } from './fixtures';

// Metadados de busca e de compartilhamento. Não dependem do motor: rodam só no Chromium.
test.skip(({ browserName }) => browserName !== 'chromium', 'o <head> é o mesmo em todo motor');

test.describe('página inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('o título é o nome do escritório, sem cidade', async ({ page }) => {
    await expect(page).toHaveTitle('Diogo Menani — Advocacia & Assessoria Jurídica');
  });

  test('Open Graph e cartão do Twitter', async ({ page }) => {
    const meta = (attribute: string, value: string) =>
      page.locator(`meta[${attribute}="${value}"]`);
    await expect(meta('property', 'og:title')).toHaveAttribute('content', site.title);
    // O mesmo nome curto do WebSite no JSON-LD: com o longo aqui, o Google tende a ficar com ele e
    // a cortá-lo no celular. O literal vai à mão para o teste não repetir o site.ts.
    await expect(meta('property', 'og:site_name')).toHaveAttribute('content', 'Diogo Menani');
    await expect(meta('property', 'og:description')).toHaveAttribute('content', site.description);
    await expect(meta('property', 'og:locale')).toHaveAttribute('content', 'pt_BR');
    await expect(meta('property', 'og:type')).toHaveAttribute('content', 'website');
    await expect(meta('name', 'twitter:card')).toHaveAttribute('content', 'summary_large_image');
  });

  test('nenhuma URL relativa no Open Graph', async ({ page }) => {
    // Quem lê o og:image ou o og:url (WhatsApp, redes) não resolve caminho relativo: sem o
    // endereço do site, essas tags não saem.
    const contents = await page
      .locator('meta[property^="og:"]')
      .evaluateAll((metas) => metas.map((meta) => meta.getAttribute('content') ?? ''));
    expect(contents.length).toBeGreaterThan(0);
    expect(contents.filter((content) => content.startsWith('/'))).toEqual([]);
  });

  test('canonical, og:url e as imagens de prévia, quando saem, são endereços absolutos', async ({
    page,
  }) => {
    // Sem o endereço do site, não saem; com ele, começam por http.
    const urls = await page
      .locator(
        'link[rel="canonical"], meta[property="og:url"], meta[property="og:image"], meta[name="twitter:image"]',
      )
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href') ?? element.getAttribute('content')),
      );
    expect(urls.filter((url) => !url?.startsWith('http'))).toEqual([]);
  });

  test('o JSON-LD é válido e descreve uma Organization', async ({ page }) => {
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json ?? '') as Record<string, unknown> & {
      '@graph'?: Record<string, unknown>[];
    };
    // Sem o endereço do site, sai só a Organization; com ele, Organization e WebSite num @graph.
    const nodes = data['@graph'] ?? [data];
    expect(nodes.map((node) => node['@type'])).toContain('Organization');
  });

  test('o título principal começa pelo nome', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      /^Diogo Menani · Advogado /,
    );
  });
});

test('o theme-color acompanha a cor do topo de cada página', async ({ page }) => {
  // mata: o theme-color fixo em royal (no Chrome do Android, a barra do navegador ficava royal
  // sobre o azul-noite do alto do hero, com uma emenda de cor)
  /** A cor de um token de tokens.css, como o navegador a calcula ("rgb(r, g, b)"). */
  const tokenColor = (token: string) =>
    page.evaluate((name) => {
      const probe = document.createElement('i');
      probe.style.color = `var(${name})`;
      document.body.append(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    }, token);
  /** O theme-color da página, no mesmo formato. */
  const themeColor = async () => {
    const hex = (await page.locator('meta[name="theme-color"]').getAttribute('content')) ?? '';
    const [r, g, b] = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
    return `rgb(${r}, ${g}, ${b})`;
  };
  await page.goto('/');
  expect(await themeColor()).toBe(await tokenColor('--navy'));
  for (const path of ['/privacidade/', '/nao-existe']) {
    await page.goto(path);
    expect(await themeColor(), path).toBe(await tokenColor('--royal'));
  }
});

test('declara só o tema claro para o navegador não escurecer a página à força', async ({
  page,
}) => {
  // mata: a página sem color-scheme (o escurecimento forçado do Android, no Chrome com "Escurecer
  // sites", no Samsung Internet e nas WebViews de apps, recoloria fundos e textos, mas não o logo
  // em <img>, que sumia no fundo quase preto)
  for (const path of ['/', '/privacidade/', '/nao-existe']) {
    await page.goto(path);
    await expect(page.locator('meta[name="color-scheme"]'), path).toHaveAttribute(
      'content',
      'only light',
    );
  }
});

test('robots.txt libera o site', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  const text = await response.text();
  expect(text).toContain('User-agent: *');
  // Sem o endereço do site, não há Sitemap:; com ele, o endereço é absoluto.
  const sitemaps = text.split('\n').filter((line) => /^sitemap:/i.test(line));
  expect(sitemaps.filter((line) => !/^sitemap:\s*http/i.test(line))).toEqual([]);
});

test('sitemap.xml é XML válido', async ({ page, request }) => {
  const response = await request.get('/sitemap.xml');
  expect(response.status()).toBe(200);
  const xml = await response.text();
  const errors = await page.evaluate(
    (source) =>
      new DOMParser().parseFromString(source, 'application/xml').getElementsByTagName('parsererror')
        .length,
    xml,
  );
  expect(errors).toBe(0);
});
