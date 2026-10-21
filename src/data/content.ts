// Conteúdo das seções: áreas de atuação, credenciais, etapas, manifesto, compromissos e dúvidas.
// Itens entre [colchetes] ainda precisam ser confirmados com o Diogo.
import { contact } from './contact';

export type AreaId = 'familia' | 'consumidor' | 'contratos' | 'trabalho' | 'imoveis' | 'empresas';

export interface PracticeArea {
  id: AreaId;
  name: string;
  description: string;
  /** Tema no seletor do topo da página: rótulo do chip e texto que o botão principal assume. */
  topic: { label: string; cta: string };
}

/** Áreas de atuação (sugestões a confirmar). Cada uma abre o WhatsApp com o nome da área. */
export const areas = [
  {
    id: 'familia',
    name: 'Família e Sucessões',
    description: 'Divórcio, guarda, pensão alimentícia, inventário e planejamento sucessório.',
    topic: { label: 'Família', cta: 'Conversar sobre família' },
  },
  {
    id: 'consumidor',
    name: 'Direito do Consumidor',
    description:
      'Cobranças indevidas, negativação, problemas com bancos, companhias aéreas e planos de saúde.',
    topic: { label: 'Consumidor', cta: 'Conversar sobre consumo' },
  },
  {
    id: 'contratos',
    name: 'Contratos e Direito Civil',
    description:
      'Elaboração e revisão de contratos, indenizações, cobranças e responsabilidade civil.',
    topic: { label: 'Contratos', cta: 'Conversar sobre contratos' },
  },
  {
    id: 'trabalho',
    name: 'Direito do Trabalho',
    description: 'Orientação e defesa em rescisões, verbas trabalhistas e relações de emprego.',
    topic: { label: 'Trabalho', cta: 'Conversar sobre trabalho' },
  },
  {
    id: 'imoveis',
    name: 'Direito Imobiliário',
    description: 'Compra e venda, locação, usucapião e regularização de imóveis.',
    topic: { label: 'Imóveis', cta: 'Conversar sobre imóveis' },
  },
  {
    id: 'empresas',
    name: 'Assessoria para Empresas',
    description: 'Contratos, prevenção de litígios e acompanhamento jurídico contínuo do negócio.',
    topic: { label: 'Empresas', cta: 'Conversar sobre empresas' },
  },
] as const satisfies readonly PracticeArea[];

export interface Credential {
  term: string;
  value: string;
}

export const credentials = [
  { term: 'Formação', value: '[Bacharel em Direito, instituição e ano]' },
  { term: 'Especialização', value: '[Pós-graduação, área e instituição]' },
  { term: 'Na advocacia desde', value: '[Ano]' },
  { term: 'Atendimento', value: `Presencial em ${contact.city} e online` },
] as const satisfies readonly Credential[];

export interface Step {
  title: string;
  text: string;
}

export const steps = [
  {
    title: 'Primeira conversa',
    text: 'Você conta o que está acontecendo, no escritório ou por videochamada. Esclareço as primeiras dúvidas e indico os documentos necessários.',
  },
  {
    title: 'Análise do caso',
    text: 'Estudo documentos, prazos e riscos para apresentar os caminhos possíveis, com prós e contras de cada um.',
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
      'É o momento de entender a sua situação e esclarecer as primeiras dúvidas, no escritório ou por videochamada. Ao final, você sabe quais são os caminhos possíveis e quais documentos reunir.',
  },
  {
    question: 'O atendimento pode ser totalmente online?',
    answer:
      'Sim. Reuniões podem ser feitas por videochamada, documentos são enviados digitalmente e os processos eletrônicos permitem acompanhar cada etapa à distância.',
  },
  {
    question: 'Quais documentos devo separar?',
    answer:
      'Documento de identidade, comprovante de residência e tudo o que se relaciona ao caso: contratos, mensagens, notificações e comprovantes. Na dúvida, traga o que tiver; a triagem é feita junto com você.',
  },
  {
    question: 'Como são definidos os honorários?',
    answer: `Consideram a complexidade e a duração estimada do caso, com base na tabela de honorários da OAB/${contact.oabState}. Tudo é apresentado antes de começar e formalizado em contrato.`,
  },
  {
    question: 'O que eu contar fica em sigilo?',
    answer:
      'Sim. O sigilo profissional é um dever do advogado e vale para tudo o que você compartilhar, inclusive na primeira conversa.',
  },
] as const satisfies readonly FaqItem[];
