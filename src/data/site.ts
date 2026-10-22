// O site para buscadores e para quem compartilha o link: título, descrição, prévia e páginas.

/**
 * Endereço do aviso de privacidade: a página e todos os links para ela. Com a barra no fim: o build
 * gera privacidade/index.html, e a Netlify e a Cloudflare Pages respondem à forma sem barra com um
 * redirecionamento. Assim link, canonical e sitemap já apontam para a URL final.
 */
export const privacyPath = '/privacidade/';

export const site = {
  /** Nome completo do escritório: o nome da Organization e o alternateName do WebSite no JSON-LD. */
  name: 'Diogo Menani — Advocacia & Assessoria Jurídica',
  /**
   * Nome do site: og:site_name e WebSite.name. O Google lê os dois (e o <title>) para o nome acima
   * do resultado e pede o mesmo em todos; o curto é o preferido, porque o celular corta o longo.
   */
  shortName: 'Diogo Menani',
  description:
    'Assessoria jurídica completa para vistos americanos, família internacional, previdenciário e consumidor. Fale com um especialista pelo WhatsApp.',
  locale: 'pt_BR',
  /** <title> da página inicial. */
  title: 'Diogo Menani — Advocacia & Assessoria Jurídica',
  /** Prévia dos links (1200×630, gerada por npm run generate:images). */
  ogImage: '/og.png',
  ogImageAlt: 'Diogo Menani — Advocacia e Assessoria Jurídica',
  /** Páginas do sitemap.xml. */
  pages: ['/', privacyPath],
} as const;
