// Conteúdo das seções: áreas de atuação, etapas, manifesto, compromissos e dúvidas.
import { contact } from './contact';

export type AreaId = 'familia-internacional' | 'vistos' | 'previdenciario' | 'consumidor';

export interface PracticeArea {
  id: AreaId;
  name: string;
  description: string;
  /** Assunto na mensagem do WhatsApp: "Gostaria de falar com um especialista sobre …". */
  subject: string;
  /** Tema no seletor do topo da página: rótulo do chip e texto que o botão principal assume. */
  topic: { label: string; cta: string };
}

/** Áreas de atuação, em ordem alfabética. Cada uma abre o WhatsApp com o assunto da área. */
export const areas = [
  {
    id: 'consumidor',
    name: 'Consumidor',
    description: 'Direito do passageiro aéreo.',
    subject: 'direito do consumidor',
    topic: { label: 'Consumidor', cta: 'Fale sobre consumo' },
  },
  {
    id: 'familia-internacional',
    name: 'Família Internacional',
    description: 'Questões de família que envolvem mais de um país.',
    subject: 'família internacional',
    topic: { label: 'Família internacional', cta: 'Fale sobre família' },
  },
  {
    id: 'previdenciario',
    name: 'Previdenciário',
    description:
      'Salário-maternidade, BPC/LOAS, auxílio-acidente, aposentadorias e demais áreas previdenciárias.',
    subject: 'direito previdenciário',
    topic: { label: 'Previdenciário', cta: 'Fale sobre previdência' },
  },
  {
    id: 'vistos',
    name: 'Vistos Americanos',
    description: 'B1/B2 (turismo), F1 (estudantes) e J1 (programas de intercâmbio específicos).',
    subject: 'vistos americanos',
    topic: { label: 'Vistos americanos', cta: 'Fale sobre vistos' },
  },
] as const satisfies readonly PracticeArea[];

export interface Step {
  title: string;
  text: string;
}

export const steps = [
  {
    title: 'Primeira conversa',
    text: 'Você conta o que está acontecendo por videochamada. Esclarecemos as primeiras dúvidas e indicamos os documentos necessários.',
  },
  {
    title: 'Análise do caso',
    text: 'Estudamos documentos, prazos e riscos para apresentar os caminhos possíveis, com prós e contras de cada um.',
  },
  {
    title: 'Proposta e contrato',
    text: 'Definimos juntos a estratégia. Honorários e etapas ficam registrados em contrato, sem surpresas.',
  },
  {
    title: 'Acompanhamento',
    text: 'Você recebe atualizações a cada movimentação relevante e tem um canal direto para tirar dúvidas.',
  },
] as const satisfies readonly Step[];

/** Frase que acende palavra por palavra durante a leitura. */
export const manifesto =
  'Entender o próprio caso traz tranquilidade. Por isso, cada orientação é explicada com clareza, cada etapa é comunicada e cada decisão é tomada junto com você.';

export interface Commitment {
  term: string;
  text: string;
}

export const commitments = [
  {
    term: 'Sigilo profissional',
    text: 'Tudo o que você compartilha é protegido pelo sigilo profissional, desde a primeira conversa.',
  },
  {
    term: 'Linguagem simples',
    text: 'Explicações claras sobre riscos, prazos e caminhos possíveis, sem juridiquês.',
  },
  {
    term: 'Honorários transparentes',
    text: 'Valores e condições definidos em contrato antes de qualquer etapa.',
  },
  {
    term: 'Atendimento online',
    text: 'Reuniões por videochamada e envio de documentos pelo WhatsApp, sem precisar sair de casa.',
  },
] as const satisfies readonly Commitment[];

export interface FaqItem {
  question: string;
  answer: string;
}

export const faq = [
  {
    question: 'Como funciona a primeira conversa?',
    answer:
      'É o momento de entender a sua situação e esclarecer as primeiras dúvidas, por videochamada. Ao final, você sabe quais são os caminhos possíveis e quais documentos reunir.',
  },
  {
    question: 'O atendimento pode ser totalmente online?',
    answer:
      'Sim, o atendimento é somente online. As reuniões são por videochamada, os documentos são enviados digitalmente e os processos eletrônicos permitem acompanhar cada etapa à distância.',
  },
  {
    question: 'Quais documentos devo separar?',
    answer:
      'Documento de identidade, comprovante de residência e tudo o que se relaciona ao caso: contratos, mensagens, notificações e comprovantes. Na dúvida, envie o que tiver; a triagem é feita junto com você.',
  },
  {
    question: 'Como são definidos os honorários?',
    answer: `Consideramos a complexidade e a duração estimada do caso, com base na tabela de honorários da OAB/${contact.oabState}. Tudo é apresentado antes de começar e formalizado em contrato.`,
  },
  {
    question: 'O que eu contar fica em sigilo?',
    answer:
      'Sim. O sigilo profissional é um dever do advogado e vale para tudo o que você compartilhar, inclusive na primeira conversa.',
  },
] as const satisfies readonly FaqItem[];
