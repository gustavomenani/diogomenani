// Contato e registro profissional do escritório: o que aparece em vários pontos da página.
// Itens entre [colchetes] ainda precisam ser confirmados com o Diogo.
import type { IconName } from './icons';

/** WhatsApp do escritório com DDD, como aparece na página; o link do wa.me sai dele. */
const phone = '(18) 99701-7246';

export const whatsapp = {
  display: phone,
  /** 55 + DDD + número, só os dígitos: o formato que o wa.me usa. */
  number: `55${phone.replace(/\D/g, '')}`,
} as const;

const oabState = 'SP';
const oabNumber = '546.508';

export const contact = {
  oabState,
  oabNumber,
  oab: `OAB/${oabState} ${oabNumber}`,
  email: { label: 'diogomenani@gmail.com', href: 'mailto:diogomenani@gmail.com' },
  hours: '[Segunda a sexta, das 9h às 18h]',
  serviceMode: 'Atendimento presencial e online',
} as const;

export type SocialIcon = Extract<IconName, 'instagram'>;

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
  /** Nome acessível quando o texto visível sozinho não diz de quem é o perfil. */
  ariaLabel?: string;
  /**
   * De quem é o perfil. No JSON-LD, o do escritório vai no sameAs do escritório e o pessoal no da
   * pessoa: o sameAs diz que o endereço é a mesma entidade, e o perfil do Diogo não é o escritório.
   */
  owner: 'office' | 'person';
}

export const social: readonly SocialLink[] = [
  {
    label: '@menani.advocacia',
    href: 'https://www.instagram.com/menani.advocacia/',
    icon: 'instagram',
    ariaLabel: 'Instagram do escritório: @menani.advocacia',
    owner: 'office',
  },
  {
    label: '@diogomenani',
    href: 'https://www.instagram.com/diogomenani/',
    icon: 'instagram',
    ariaLabel: 'Instagram de Diogo Menani: @diogomenani',
    owner: 'person',
  },
];
