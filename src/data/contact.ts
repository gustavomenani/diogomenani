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
  serviceMode: 'Atendimento somente online',
} as const;

export type SocialIcon = Extract<IconName, 'instagram' | 'tiktok' | 'facebook'>;

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
  /** Nome acessível quando o texto visível sozinho não diz de quem é o perfil. */
  ariaLabel?: string;
}

/** Perfis do escritório: todos entram no sameAs do JSON-LD. */
export const social: readonly SocialLink[] = [
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/menani.advocacia/',
    icon: 'instagram',
    ariaLabel: 'Instagram do escritório: @menani.advocacia',
  },
  {
    label: 'TikTok',
    href: 'https://www.tiktok.com/@menani.advocacia',
    icon: 'tiktok',
    ariaLabel: 'TikTok do escritório: @menani.advocacia',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/menani.advocacia/',
    icon: 'facebook',
    ariaLabel: 'Facebook do escritório: menani.advocacia',
  },
];
