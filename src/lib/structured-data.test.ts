import { describe, expect, test } from 'vitest';
import { site } from '../data/site';
import {
  confirmedProfiles,
  organization,
  serializeJsonLd,
  structuredData,
} from './structured-data';

describe('organization', () => {
  test('é uma Organization do schema.org', () => {
    // Sem endereço publicado, um LegalService (subtipo de LocalBusiness) seria inválido no Google.
    expect(organization(undefined)).toMatchObject({
      '@context': 'https://schema.org',
      '@type': 'Organization',
    });
  });

  test('o telefone sai no formato internacional', () => {
    expect(organization(undefined)).toHaveProperty('telephone', '+55 18 99701-7246');
  });

  test('o e-mail é o do escritório', () => {
    // Literal à mão: comparado com contact.email, o teste passaria com qualquer valor.
    expect(organization(undefined)).toHaveProperty('email', 'diogomenani@gmail.com');
  });

  test('knowsAbout lista as 4 áreas de atuação', () => {
    expect(organization(undefined)).toHaveProperty('knowsAbout', [
      'Família Internacional',
      'Vistos Americanos',
      'Previdenciário',
      'Consumidor',
    ]);
  });

  test('o sameAs do escritório traz só o Instagram do escritório', () => {
    // O sameAs diz que o endereço é a mesma entidade: o perfil pessoal do Diogo não é o escritório.
    expect(organization(undefined)).toHaveProperty('sameAs', [
      'https://www.instagram.com/menani.advocacia/',
    ]);
  });

  test('a pessoa sai como member, com o Instagram dela e a inscrição na OAB', () => {
    expect(organization(undefined)).toMatchObject({
      member: {
        '@type': 'Person',
        name: 'Diogo Menani',
        jobTitle: 'Advogado',
        sameAs: ['https://www.instagram.com/diogomenani/'],
        hasCredential: {
          '@type': 'EducationalOccupationalCredential',
          identifier: 'OAB/SP 546.508',
        },
      },
    });
  });

  test('sem endereço nem cidade no site, o JSON-LD também não traz nenhum dos dois', () => {
    // I72: o endereço e a cidade saíram do site a pedido do cliente.
    expect(organization(undefined)).not.toHaveProperty('address');
    expect(organization(undefined)).not.toHaveProperty('areaServed');
  });

  test('sem o endereço do site, não há url, image nem logo', () => {
    const data = organization(undefined);
    expect(data).not.toHaveProperty('url');
    expect(data).not.toHaveProperty('image');
    expect(data).not.toHaveProperty('logo');
  });

  test('com o endereço do site, url, image e logo saem absolutos', () => {
    expect(organization(new URL('https://exemplo.adv.br'))).toMatchObject({
      url: 'https://exemplo.adv.br/',
      image: 'https://exemplo.adv.br/og.png',
      logo: 'https://exemplo.adv.br/apple-touch-icon.png',
    });
  });
});

describe('structuredData', () => {
  test('sem o endereço do site, sai só a Organization, sem WebSite', () => {
    // O url do WebSite é obrigatório e absoluto: sem o site, não há como montá-lo.
    expect(structuredData(undefined)).toEqual(organization(undefined));
  });

  test('com o endereço do site, o WebSite sai no @graph com o nome curto, a url absoluta e o publisher ligado à Organization', () => {
    // mata: a home sem WebSite (o nome acima do resultado ficava a critério do Google, entre o
    // <title> longo e o h1)
    const data = structuredData(new URL('https://exemplo.adv.br'));
    expect(data['@context']).toBe('https://schema.org');
    const nodes = data['@graph'] as Record<string, unknown>[];
    const org = nodes.find((node) => node['@type'] === 'Organization');
    const website = nodes.find((node) => node['@type'] === 'WebSite');
    expect(org).toMatchObject({ url: 'https://exemplo.adv.br/', name: site.name });
    expect(org).not.toHaveProperty('@context');
    expect(website).toMatchObject({
      name: 'Diogo Menani',
      alternateName: site.name,
      url: 'https://exemplo.adv.br/',
      inLanguage: 'pt-BR',
      publisher: { '@id': org?.['@id'] },
    });
    expect(org?.['@id']).toMatch(/^https:\/\/exemplo\.adv\.br\/#/);
  });
});

describe('confirmedProfiles', () => {
  test('o perfil com link provisório fica de fora, e o preenchido entra', () => {
    expect(
      confirmedProfiles([
        {
          label: 'Instagram [perfil]',
          href: 'https://www.instagram.com/',
          icon: 'instagram',
          owner: 'office',
        },
        {
          label: '@fulano',
          href: 'https://www.instagram.com/fulano/',
          icon: 'instagram',
          owner: 'office',
        },
      ]),
    ).toEqual(['https://www.instagram.com/fulano/']);
  });
});

describe('serializeJsonLd', () => {
  test('um "</script>" num valor não fecha o script', () => {
    const json = serializeJsonLd({ name: 'a</script><script>alert(1)</script>' });
    expect(json).not.toContain('<');
    expect(JSON.parse(json)).toEqual({ name: 'a</script><script>alert(1)</script>' });
  });
});
