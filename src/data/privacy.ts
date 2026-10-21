// Aviso de privacidade (/privacidade). É um ponto de partida: o texto deve ser revisado pelo Diogo
// antes da publicação. Os links (política do WhatsApp e ANPD) saem como marcação na página.
import { contact, whatsapp } from './contact';

/** Data da última revisão do aviso, como aparece na abertura. */
export const privacyUpdated = '20 de outubro de 2026';

/** Um parágrafo, ou uma lista (cada item, uma string). */
export type PrivacyBlock = string | readonly string[];

export interface PrivacySection {
  title: string;
  paragraphs: readonly PrivacyBlock[];
}

export const privacySections: readonly PrivacySection[] = [
  {
    title: 'Quem é o responsável',
    paragraphs: [
      `Diogo Menani, advogado inscrito na ${contact.oab}, é o responsável pelos dados pessoais que você envia. Para falar sobre eles, use o WhatsApp ${whatsapp.display} ou o e-mail ${contact.email.label}.`,
    ],
  },
  {
    title: 'O que o site coleta',
    paragraphs: [
      'O site não usa cookies, não tem ferramentas de estatística ou de publicidade e não guarda o que você digita. O formulário de contato só monta a mensagem no seu próprio navegador e abre o WhatsApp com ela pronta: nada é enviado até você tocar em enviar dentro do WhatsApp. O provedor que hospeda o site pode registrar dados técnicos de cada acesso, como o endereço IP, por segurança e para o site funcionar.',
    ],
  },
  {
    title: 'Para que os dados são usados',
    paragraphs: [
      'O que você envia (nome, telefone, e-mail e o relato do caso) serve só para responder ao seu contato e, se você decidir contratar, para o seu atendimento. Os dados não são vendidos nem usados para outra finalidade e ficam protegidos pelo sigilo profissional do advogado.',
    ],
  },
  {
    title: 'WhatsApp',
    paragraphs: [
      'A conversa acontece no WhatsApp, um serviço da Meta. O que o próprio aplicativo faz com os dados segue a política de privacidade do WhatsApp.',
    ],
  },
  {
    title: 'Por quanto tempo',
    paragraphs: [
      'Os dados ficam guardados pelo tempo necessário para responder ao contato e, se houver contratação, pelo prazo que as obrigações legais e profissionais do advogado exigem.',
    ],
  },
  {
    title: 'Seus direitos',
    paragraphs: [
      'Pela Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você pode pedir, entre outros direitos:',
      [
        'a confirmação de que seus dados são tratados;',
        'o acesso a eles;',
        'a correção;',
        'a eliminação dos que não forem mais necessários;',
        'a revogação do consentimento.',
      ],
      'Faça o pedido pelos contatos acima. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).',
    ],
  },
];
