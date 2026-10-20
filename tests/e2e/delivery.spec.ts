import { readdirSync, readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

/** Regra de cache dos assets com hash no nome: nunca mudam, então o navegador guarda por 1 ano. */
const LONG_CACHE = 'public, max-age=31536000, immutable';

/** Largura e altura de um PNG, lidas do cabeçalho IHDR (logo depois da assinatura de 8 bytes). */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('o CSS vem embutido', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(0);
  const withTokens = await page
    .locator('style')
    .evaluateAll(
      (styles) => styles.filter((style) => style.textContent.includes('--royal')).length,
    );
  expect(withTokens).toBeGreaterThan(0);
});

test('favicons PNG e ícone do iOS', async ({ page, request }) => {
  await page.goto('/');
  const icons = [
    { link: 'link[rel=icon][type="image/png"][sizes="32x32"]', href: '/favicon-32.png', side: 32 },
    { link: 'link[rel=apple-touch-icon]', href: '/apple-touch-icon.png', side: 180 },
  ];
  for (const { link, href, side } of icons) {
    await expect(page.locator(link)).toHaveAttribute('href', href);
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toBe('image/png');
    expect(pngSize(await response.body()), href).toEqual({ width: side, height: side });
  }
});

test('imagem de prévia em 1200×630', async ({ request }) => {
  const response = await request.get('/og.png');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect(pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
});

test('cache longo dos assets declarado', () => {
  // Netlify (e Cloudflare Pages) leem o _headers publicado; a Vercel lê o vercel.json da raiz.
  const headers = readFileSync(new URL('../../dist/_headers', import.meta.url), 'utf8');
  expect(headers).toMatch(
    new RegExp(`^/_astro/\\*\\r?\\n[ \\t]+Cache-Control: ${LONG_CACHE}\\r?$`, 'm'),
  );

  const vercel = JSON.parse(
    readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
  ) as { headers?: { source: string; headers: { key: string; value: string }[] }[] };
  expect(vercel.headers).toContainEqual({
    source: '/_astro/(.*)',
    headers: [{ key: 'Cache-Control', value: LONG_CACHE }],
  });
});

test.describe('sizes do retrato', () => {
  const hasPhoto = readdirSync(new URL('../../src/assets/', import.meta.url)).some((file) =>
    /^diogo\.(jpe?g|png|webp)$/i.test(file),
  );

  for (const width of [390, 800, 1024, 1440]) {
    test(`sizes do retrato bate com a largura em ${width} px`, async ({ page }) => {
      test.skip(!hasPhoto, 'sem src/assets/diogo.*, o retrato é o placeholder (sem sizes)');
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const photo = page.locator('#sobre').getByRole('img', { name: 'Diogo Menani' });
      const { rendered, chosen } = await photo.evaluate((img: HTMLImageElement) => {
        /** Divide nas vírgulas e espaços de fora dos parênteses (calc e min têm os seus). */
        const splitTop = (text: string, separator: RegExp) => {
          const parts: string[] = [];
          let depth = 0;
          let current = '';
          for (const char of text) {
            if (char === '(') depth++;
            if (char === ')') depth--;
            if (depth === 0 && separator.test(char)) {
              if (current.trim()) parts.push(current.trim());
              current = '';
            } else current += char;
          }
          if (current.trim()) parts.push(current.trim());
          return parts;
        };
        /** Mede um comprimento CSS (vw, calc) na largura de um elemento de teste. */
        const measure = (length: string) => {
          const probe = document.createElement('div');
          probe.style.cssText = `position: absolute; height: 0; width: ${length}`;
          document.body.append(probe);
          const value = probe.getBoundingClientRect().width;
          probe.remove();
          return value;
        };
        // Cada item é "<condição de mídia> <comprimento>"; o último pode não ter condição.
        const entries = splitTop(img.sizes, /,/).map((entry) => {
          const tokens = splitTop(entry, /\s/);
          return { media: tokens.slice(0, -1).join(' '), length: tokens.at(-1) ?? '' };
        });
        const match = entries.find(({ media }) => !media || matchMedia(media).matches);
        // offsetWidth é a largura do layout: as transformações da revelação não entram.
        return { rendered: img.offsetWidth, chosen: match ? measure(match.length) : 0 };
      });
      expect(rendered).toBeGreaterThan(0);
      // O sizes não pode subestimar (a imagem sairia borrada) nem sobrar mais de 10%.
      expect(rendered).toBeLessThanOrEqual(chosen + 1);
      expect(rendered).toBeGreaterThanOrEqual(chosen * 0.9);
    });
  }
});
