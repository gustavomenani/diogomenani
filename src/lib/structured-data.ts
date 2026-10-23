// Dados estruturados (JSON-LD) do escritório, para os buscadores: tudo vem de src/data/.
import { contact, social, whatsapp, type SocialLink } from '../data/contact';
import { areas } from '../data/content';
import { site } from '../data/site';

/** Telefone no formato internacional, com espaços: (18) 99701-7246 vira +55 18 99701-7246. */
const telephone = `+55 ${whatsapp.display.replace(/[()]/g, '')}`;

/**
 * Endereços dos perfis já confirmados. Perfil com [colchetes] no rótulo ainda tem link provisório
 * (só o domínio da rede) e fica de fora: no sameAs, diria que o escritório é o site.
 */
export function confirmedProfiles(links: readonly SocialLink[]): string[] {
  return links.filter(({ label }) => !label.includes('[')).map(({ href }) => href);
}

/** Os perfis do escritório. */
const officeProfiles = confirmedProfiles(social);

/**
 * O escritório como `Organization` do schema.org. Sem endereço no site (I72), um `LegalService`
 * (subtipo de LocalBusiness) fica inválido para o Google, que exige `address`; o `Organization`
 * não tem campo obrigatório. Se o endereço voltar, volta o LegalService com address. O Diogo
 * entra como `member` (o site não diz que ele fundou o escritório), com a inscrição na OAB; o site
 * não publica perfil pessoal dele. `url`, `image` e `logo` exigem endereço absoluto e só saem com o
 * `site` do astro.config.mjs (`Astro.site`).
 */
export function organization(siteUrl: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: site.name,
    description: site.description,
    telephone,
    email: contact.email.label,
    knowsAbout: areas.map(({ name }) => name),
    sameAs: officeProfiles,
    member: {
      '@type': 'Person',
      name: site.shortName,
      jobTitle: 'Advogado',
      hasCredential: {
        '@type': 'EducationalOccupationalCredential',
        credentialCategory: 'Inscrição na OAB',
        identifier: contact.oab,
      },
    },
    ...(siteUrl && {
      url: new URL('/', siteUrl).href,
      image: new URL(site.ogImage, siteUrl).href,
      // PNG de 180×180, acima do mínimo de 112 px que o Google pede para o logo no resultado.
      logo: new URL('/apple-touch-icon.png', siteUrl).href,
    }),
  };
}

/**
 * O JSON-LD da home: a `Organization` e, com o `site` do astro.config.mjs, também o `WebSite`, o
 * sinal que o Google usa para o nome acima do resultado. O curto é o preferido (o celular corta
 * nomes longos), o mesmo do og:site_name, e o completo fica como alternativa. Sem o `site`, sai só
 * a `Organization`: o `url` do `WebSite` é obrigatório e tem de ser absoluto. Os dois nós vão num
 * `@graph`, ligados pelo `@id` (o `publisher` do site é o escritório).
 */
export function structuredData(siteUrl: URL | undefined): Record<string, unknown> {
  const org = organization(siteUrl);
  if (!siteUrl) return org;
  const home = new URL('/', siteUrl).href;
  const { '@context': context, ...orgNode } = org;
  return {
    '@context': context,
    '@graph': [
      { ...orgNode, '@id': `${home}#organizacao` },
      {
        '@type': 'WebSite',
        '@id': `${home}#site`,
        name: site.shortName,
        alternateName: site.name,
        url: home,
        inLanguage: 'pt-BR',
        publisher: { '@id': `${home}#organizacao` },
      },
    ],
  };
}

/**
 * O JSON-LD como texto para o `<script>`: todo "<" sai como escape unicode do JSON, então um
 * "</script>" num valor (um nome, uma descrição) não fecha o script antes da hora. Para quem lê o
 * JSON, é o mesmo caractere.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
