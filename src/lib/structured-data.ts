// Dados estruturados (JSON-LD) do escritório, para os buscadores: tudo vem de src/data/.
import { contact, social, whatsapp, type SocialLink } from '../data/contact';
import { areas } from '../data/content';
import { site } from '../data/site';

/** Telefone no formato internacional, com espaços: (18) 99701-7249 vira +55 18 99701-7249. */
const telephone = `+55 ${whatsapp.display.replace(/[()]/g, '')}`;

/**
 * Endereços dos perfis já confirmados. Perfil com [colchetes] no rótulo ainda tem link provisório
 * (o do LinkedIn é só linkedin.com) e fica de fora: no sameAs, diria que o escritório é o site.
 */
export function confirmedProfiles(links: readonly SocialLink[]): string[] {
  return links.filter(({ label }) => !label.includes('[')).map(({ href }) => href);
}

/**
 * O escritório como `LegalService` do schema.org. `url` e `image` exigem endereço absoluto, então
 * só saem com o `site` do astro.config.mjs (`Astro.site`).
 */
export function legalService(siteUrl: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: site.name,
    description: site.description,
    telephone,
    email: contact.email.label,
    address: { '@type': 'PostalAddress', streetAddress: contact.address, addressCountry: 'BR' },
    areaServed: contact.city,
    knowsAbout: areas.map(({ name }) => name),
    sameAs: confirmedProfiles(social),
    ...(siteUrl && {
      url: new URL('/', siteUrl).href,
      image: new URL(site.ogImage, siteUrl).href,
    }),
  };
}

/**
 * O JSON-LD como texto para o `<script>`: todo "<" sai como escape unicode do JSON, então um
 * "</script>" num valor (um endereço, um nome) não fecha o script antes da hora. Para quem lê o
 * JSON, é o mesmo caractere.
 */
export function serializeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
