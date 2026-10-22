import { describe, expect, test } from 'vitest';
import { site } from '../data/site';
import { pageUrls } from './page-meta';
import { robotsTxt, sitemapXml } from './seo-files';

// O build só roda sem domínio: estes testes são a primeira execução do sitemap e do robots.txt com
// o endereço do site, antes de ele ir ao ar.
const SITE = new URL('https://exemplo.adv.br');

/** Os endereços dos `<loc>` do sitemap, na ordem. */
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, href]) => href);

describe('sitemapXml', () => {
  test('com o endereço do site, o sitemap lista as páginas com endereço absoluto', () => {
    expect(locs(sitemapXml(site.pages, SITE))).toEqual([
      'https://exemplo.adv.br/',
      'https://exemplo.adv.br/privacidade/',
    ]);
  });

  test('cada endereço do sitemap é o canonical da página', () => {
    // Uma barra a mais ou a menos de um lado faria o Google ver duas URLs para a mesma página.
    expect(locs(sitemapXml(site.pages, SITE))).toEqual(
      site.pages.map((path) => pageUrls(path, SITE, false).canonical),
    );
  });

  test('sem o endereço do site, o urlset fica vazio', () => {
    const xml = sitemapXml(site.pages, undefined);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(locs(xml)).toEqual([]);
  });
});

describe('robotsTxt', () => {
  test('com o endereço do site, o robots.txt aponta para o sitemap absoluto', () => {
    expect(robotsTxt(SITE)).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://exemplo.adv.br/sitemap.xml\n',
    );
  });

  test('sem o endereço do site, o robots.txt não tem linha Sitemap:', () => {
    expect(robotsTxt(undefined)).toBe('User-agent: *\nAllow: /\n');
  });
});
