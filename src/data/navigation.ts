/** Âncoras das seções: valem para os ids das seções e para todos os links internos. */
export const sectionIds = {
  top: 'inicio',
  main: 'conteudo',
  about: 'sobre',
  areas: 'atuacao',
  process: 'como-trabalho',
  faq: 'duvidas',
  contact: 'contato',
} as const;

export type SectionId = (typeof sectionIds)[keyof typeof sectionIds];

export interface NavLink {
  id: SectionId;
  label: string;
}

/** Href de um link interno para a seção. */
export function anchor(id: SectionId): string {
  return `#${id}`;
}

/** Navegação do header e do menu mobile. */
export const nav: readonly NavLink[] = [
  { id: sectionIds.about, label: 'Sobre' },
  { id: sectionIds.areas, label: 'Atuação' },
  { id: sectionIds.process, label: 'Como trabalho' },
  { id: sectionIds.faq, label: 'Dúvidas' },
  { id: sectionIds.contact, label: 'Contato' },
];

/** Navegação do rodapé, com rótulos por extenso. */
export const footerNav: readonly NavLink[] = [
  { id: sectionIds.about, label: 'Sobre' },
  { id: sectionIds.areas, label: 'Áreas de atuação' },
  { id: sectionIds.process, label: 'Como trabalho' },
  { id: sectionIds.faq, label: 'Dúvidas frequentes' },
];
