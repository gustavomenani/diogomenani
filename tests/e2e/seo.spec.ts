import { site } from '../../src/data/site';
import { test, expect } from './fixtures';

// Metadados de busca e de compartilhamento. Não dependem do motor: rodam só no Chromium.
test.skip(({ browserName }) => browserName !== 'chromium', 'o <head> é o mesmo em todo motor');

test.describe('página inicial', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('o título tem a cidade', async ({ page }) => {
    await expect(page).toHaveTitle(site.title);
  });

  test('Open Graph e cartão do Twitter', async ({ page }) => {
    const meta = (attribute: string, value: string) =>
      page.locator(`meta[${attribute}="${value}"]`);
    await expect(meta('property', 'og:title')).toHaveAttribute('content', site.title);
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

  test('o JSON-LD é válido e descreve um LegalService', async ({ page }) => {
    const json = await page.locator('script[type="application/ld+json"]').textContent();
    const data = JSON.parse(json ?? '') as Record<string, unknown>;
    expect(data['@type']).toBe('LegalService');
  });

  test('o título principal começa pelo nome e pela cidade', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(
      /^Diogo Menani · Advogado em /,
    );
  });
});

test('robots.txt libera o site', async ({ request }) => {
  const response = await request.get('/robots.txt');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('User-agent: *');
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
