import { test, expect, type Page } from './fixtures';

interface FontDownload {
  url: string;
  ok: boolean;
}

/** Registra cada arquivo de fonte que a página baixa (preloads incluídos). */
function recordFontDownloads(page: Page): FontDownload[] {
  const downloads: FontDownload[] = [];
  page.on('response', (response) => {
    if (new URL(response.url()).pathname.endsWith('.woff2')) {
      downloads.push({ url: response.url(), ok: response.ok() });
    }
  });
  return downloads;
}

async function waitForFonts(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}

test('nenhuma requisição a terceiros (nem ao Google Fonts)', async ({ page }) => {
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  await page.goto('/');
  await waitForFonts(page);
  const origin = new URL(page.url()).origin;
  const thirdParty = requested.filter(
    (url) => !url.startsWith('data:') && new URL(url).origin !== origin,
  );
  expect(thirdParty).toEqual([]);
});

test('títulos e texto usam as fontes do próprio site', async ({ page }) => {
  const downloads = recordFontDownloads(page);
  await page.goto('/');
  const families = await page.evaluate(async () => {
    await document.fonts.ready;
    const unquote = (name: string) => name.trim().replace(/^(["'])(.*)\1$/, '$2');
    const loaded = new Set(
      [...document.fonts]
        .filter((face) => face.status === 'loaded')
        .map((face) => unquote(face.family)),
    );
    // A primeira família da pilha é a fonte do site; as demais são fallbacks.
    const primary = (element: Element | null) => {
      const family = unquote(
        element ? (getComputedStyle(element).fontFamily.split(',')[0] ?? '') : '',
      );
      return { family, loaded: loaded.has(family) };
    };
    return {
      heading: primary(document.querySelector('h1')),
      text: primary(document.querySelector('[data-page]')),
    };
  });
  expect(families).toEqual({
    heading: { family: expect.stringMatching(/^Bodoni Moda/), loaded: true },
    text: { family: expect.stringMatching(/^Hanken Grotesk/), loaded: true },
  });
  const origin = new URL(page.url()).origin;
  expect(downloads.length).toBeGreaterThan(0);
  expect(downloads.filter(({ url, ok }) => !ok || new URL(url).origin !== origin)).toEqual([]);
});

test('as variantes normais têm preload e cada fonte baixa uma vez só', async ({ page }) => {
  const downloads = recordFontDownloads(page);
  await page.goto('/');
  await waitForFonts(page);
  // Sem crossorigin o navegador não aproveita o preload e baixa a fonte de novo.
  await expect(
    page.locator('link[rel="preload"][as="font"][type="font/woff2"][crossorigin]'),
  ).toHaveCount(2);
  const urls = downloads.map(({ url }) => url);
  expect(new Set(urls).size).toBe(urls.length);
  // Bodoni Moda normal e itálica e Hanken Grotesk normal: nenhum arquivo baixado à toa.
  expect(urls).toHaveLength(3);
});
