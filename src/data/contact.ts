// Contato e registro profissional do escritório: o que aparece em vários pontos da página.
// Itens entre [colchetes] ainda precisam ser confirmados com o Diogo.
import type { IconName } from './icons';

/** WhatsApp do escritório com DDD, como aparece na página; o link do wa.me sai dele. */
const phone = '(18) 99701-7249';

export const whatsapp = {
  display: phone,
  /** 55 + DDD + número, só os dígitos: o formato que o wa.me usa. */
  number: `55${phone.replace(/\D/g, '')}`,
} as const;

const oabState = '[UF]';
const oabNumber = '[000.000]';

export const contact = {
  oabState,
  oabNumber,
  oab: `OAB/${oabState} ${oabNumber}`,
  city: '[Cidade/UF]',
  email: { label: '[contato@seudominio.adv.br]', href: 'mailto:contato@seudominio.adv.br' },
  address: '[Rua, número, bairro, Cidade/UF]',
  hours: '[Segunda a sexta, das 9h às 18h]',
  serviceMode: 'Atendimento presencial e online',
} as const;

export type SocialIcon = Extract<IconName, 'instagram' | 'linkedin'>;

export interface SocialLink {
  label: string;
  href: string;
  icon: SocialIcon;
  /** Nome acessível quando o texto visível sozinho não diz de quem é o perfil. */
  ariaLabel?: string;
}

export const social: readonly SocialLink[] = [
  {
    label: '@menani.advocacia',
    href: 'https://www.instagram.com/menani.advocacia/',
    icon: 'instagram',
    ariaLabel: 'Instagram do escritório: @menani.advocacia',
  },
  {
    label: '@diogomenani',
    href: 'https://www.instagram.com/diogomenani/',
    icon: 'instagram',
    ariaLabel: 'Instagram de Diogo Menani: @diogomenani',
  },
  { label: 'LinkedIn [perfil]', href: 'https://linkedin.com/', icon: 'linkedin' },
];
