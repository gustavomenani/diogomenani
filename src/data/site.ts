// O site para buscadores e para quem compartilha o link: título, descrição, prévia e páginas.
import { contact } from './contact';

export const site = {
  /** Nome completo do escritório: og:site_name e o nome no JSON-LD. */
  name: 'Diogo Menani — Advocacia & Assessoria Jurídica',
  shortName: 'Diogo Menani',
  description:
    'Advocacia e assessoria jurídica para pessoas e empresas, com atendimento presencial e online. Converse com Diogo Menani pelo WhatsApp.',
  locale: 'pt_BR',
  /** <title> da página inicial; a cidade ajuda quem busca um advogado na região. */
  title: `Diogo Menani — Advogado em ${contact.city}`,
  /** Prévia dos links (1200×630, gerada por npm run generate:images). */
  ogImage: '/og.png',
  ogImageAlt: 'Diogo Menani — Advocacia e Assessoria Jurídica',
  /** Páginas do sitemap.xml. */
  pages: ['/', '/privacidade'],
} as const;
