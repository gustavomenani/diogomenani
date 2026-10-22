import { experimental_AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import { site } from '../data/site';
import Base from './Base.astro';

/**
 * O componente que o renderToString pede. O programa do typescript-eslint não resolve o tipo dos
 * .astro (ver eslint.config.js) e veria o import como erro; o astro check confere o tipo de fato.
 */
type Component = Parameters<experimental_AstroContainer['renderToString']>[0];

/**
 * O <head> do layout renderizado com um `site`: o build roda sem domínio, então as tags que
 * dependem dele (og:image, twitter:image) não saem no dist/ nem nos testes do navegador.
 */
async function headWithSite(): Promise<string> {
  const container = await experimental_AstroContainer.create({
    astroConfig: { site: 'https://exemplo.adv.br' },
  });
  const html = await container.renderToString(Base as Component, {
    props: { title: site.title, description: site.description, path: '/' },
    partial: false,
  });
  return html.slice(0, html.indexOf('</head>'));
}

/** O content de uma <meta> pelo atributo e pelo valor dele, ou undefined se ela não sair. */
function metaContent(head: string, attribute: string, value: string): string | undefined {
  const tag = new RegExp(`<meta ${attribute}="${value}" content="([^"]*)"`).exec(head);
  return tag?.[1]?.replaceAll('&amp;', '&');
}

describe('Base, com o endereço do site', () => {
  test('o cartão do X descreve a imagem de prévia com o mesmo texto do og:image:alt', async () => {
    // O X não usa o og:image:alt como alternativa: sem o twitter:image:alt, a prévia do link sai
    // sem descrição da imagem para quem usa leitor de tela.
    const head = await headWithSite();
    expect(metaContent(head, 'name', 'twitter:image')).toBe('https://exemplo.adv.br/og.png');
    expect(metaContent(head, 'property', 'og:image:alt')).toBe(site.ogImageAlt);
    expect(metaContent(head, 'name', 'twitter:image:alt')).toBe(site.ogImageAlt);
  });
});
