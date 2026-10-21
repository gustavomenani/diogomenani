import { describe, expect, test } from 'vitest';
import { pageUrls } from './page-meta';

const SITE = new URL('https://exemplo.adv.br');

describe('pageUrls', () => {
  test('com o endereço do site, canonical e imagem saem absolutos', () => {
    expect(pageUrls('/privacidade', SITE, false)).toEqual({
      canonical: 'https://exemplo.adv.br/privacidade',
      ogImage: 'https://exemplo.adv.br/og.png',
    });
  });

  test('sem o endereço do site, nenhum dos dois sai', () => {
    expect(pageUrls('/', undefined, false)).toEqual({ canonical: undefined, ogImage: undefined });
  });

  test('com noindex, a página não tem canonical, mas mantém a imagem de prévia', () => {
    expect(pageUrls('/404', SITE, true)).toEqual({
      canonical: undefined,
      ogImage: 'https://exemplo.adv.br/og.png',
    });
  });
});
