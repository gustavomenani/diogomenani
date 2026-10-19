// Conteúdo editável do site: contatos, áreas, etapas, compromissos e dúvidas.
// Itens entre [colchetes] ainda precisam ser confirmados com o Diogo.

export const whatsapp = {
  display: '(18) 99701-7249',
  /** 55 + DDD + número, o formato que o wa.me usa. */
  number: '5518997017249',
};

export const defaultMessage = 'Olá, Dr. Diogo! Gostaria de agendar uma conversa.';

/** Link do WhatsApp, com mensagem pronta quando `text` é informado. */
export function waLink(text?: string): string {
  const base = `https://wa.me/${whatsapp.number}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

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
};

export type SocialIcon = 'instagram' | 'linkedin';

export const social: { label: string; href: string; icon: SocialIcon; ariaLabel?: string }[] = [
  { label: '@menani.advocacia', href: 'https://www.instagram.com/menani.advocacia/', icon: 'instagram', ariaLabel: 'Instagram do escritório: @menani.advocacia' },
  { label: '@diogomenani', href: 'https://www.instagram.com/diogomenani/', icon: 'instagram', ariaLabel: 'Instagram de Diogo Menani: @diogomenani' },
  { label: 'LinkedIn [perfil]', href: 'https://linkedin.com/', icon: 'linkedin' },
];

export const nav = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#atuacao', label: 'Atuação' },
  { href: '#como-trabalho', label: 'Como trabalho' },
  { href: '#duvidas', label: 'Dúvidas' },
  { href: '#contato', label: 'Contato' },
];

export const footerNav = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#atuacao', label: 'Áreas de atuação' },
  { href: '#como-trabalho', label: 'Como trabalho' },
  { href: '#duvidas', label: 'Dúvidas frequentes' },
];

/** Áreas de atuação (sugestões a confirmar). Cada uma abre o WhatsApp com o tema. */
export const areas = [
  { name: 'Família e Sucessões', desc: 'Divórcio, guarda, pensão alimentícia, inventário e planejamento sucessório.' },
  { name: 'Direito do Consumidor', desc: 'Cobranças indevidas, negativação, problemas com bancos, companhias aéreas e planos de saúde.' },
  { name: 'Contratos e Direito Civil', desc: 'Elaboração e revisão de contratos, indenizações, cobranças e responsabilidade civil.' },
  { name: 'Direito do Trabalho', desc: 'Orientação e defesa em rescisões, verbas trabalhistas e relações de emprego.' },
  { name: 'Direito Imobiliário', desc: 'Compra e venda, locação, usucapião e regularização de imóveis.' },
  { name: 'Assessoria para Empresas', desc: 'Contratos, prevenção de litígios e acompanhamento jurídico contínuo do negócio.' },
];

/** Temas do seletor no topo da página: o botão principal muda para o tema escolhido. */
export const topics = [
  { id: 'familia', label: 'Família', cta: 'Conversar sobre família', area: 'Família e Sucessões' },
  { id: 'consumidor', label: 'Consumidor', cta: 'Conversar sobre consumo', area: 'Direito do Consumidor' },
  { id: 'contratos', label: 'Contratos', cta: 'Conversar sobre contratos', area: 'Contratos e Direito Civil' },
  { id: 'trabalho', label: 'Trabalho', cta: 'Conversar sobre trabalho', area: 'Direito do Trabalho' },
  { id: 'imoveis', label: 'Imóveis', cta: 'Conversar sobre imóveis', area: 'Direito Imobiliário' },
  { id: 'empresas', label: 'Empresas', cta: 'Conversar sobre empresas', area: 'Assessoria para Empresas' },
];

export const credentials = [
  { term: 'Formação', value: '[Bacharel em Direito, instituição e ano]' },
  { term: 'Especialização', value: '[Pós-graduação, área e instituição]' },
  { term: 'Na advocacia desde', value: '[Ano]' },
  { term: 'Atendimento', value: `Presencial em ${contact.city} e online` },
];

export const steps = [
  { title: 'Primeira conversa', text: 'Você conta o que está acontecendo, no escritório ou por videochamada. Esclareço as primeiras dúvidas e indico os documentos necessários.' },
  { title: 'Análise do caso', text: 'Estudo documentos, prazos e riscos para apresentar os caminhos possíveis, com prós e contras de cada um.' },
  { title: 'Proposta e contrato', text: 'Definimos juntos a estratégia. Honorários e etapas ficam registrados em contrato, sem surpresas.' },
  { title: 'Acompanhamento', text: 'Você recebe atualizações a cada movimentação relevante e tem um canal direto para tirar dúvidas.' },
];

/** Frase que acende palavra por palavra durante a leitura. */
export const manifesto = 'Entender o próprio caso traz tranquilidade. Por isso, cada orientação é explicada com clareza, cada etapa é comunicada e cada decisão é tomada junto com você.';

export const commitments = [
  { term: 'Sigilo profissional', text: 'Tudo o que você compartilha é protegido pelo sigilo profissional, desde a primeira conversa.' },
  { term: 'Linguagem simples', text: 'Explicações claras sobre riscos, prazos e caminhos possíveis, sem juridiquês.' },
  { term: 'Honorários transparentes', text: 'Valores e condições definidos em contrato antes de qualquer etapa.' },
  { term: 'Atendimento online', text: 'Reuniões por videochamada e envio seguro de documentos, sem precisar sair de casa.' },
];

export const faq = [
  { q: 'Como funciona a primeira conversa?', a: 'É o momento de entender a sua situação e esclarecer as primeiras dúvidas, no escritório ou por videochamada. Ao final, você sabe quais são os caminhos possíveis e quais documentos reunir.' },
  { q: 'O atendimento pode ser totalmente online?', a: 'Sim. Reuniões podem ser feitas por videochamada, documentos são enviados digitalmente e os processos eletrônicos permitem acompanhar cada etapa à distância.' },
  { q: 'Quais documentos devo separar?', a: 'Documento de identidade, comprovante de residência e tudo o que se relaciona ao caso: contratos, mensagens, notificações e comprovantes. Na dúvida, traga o que tiver; a triagem é feita junto com você.' },
  { q: 'Como são definidos os honorários?', a: `Consideram a complexidade e a duração estimada do caso, com base na tabela de honorários da OAB/${oabState}. Tudo é apresentado antes de começar e formalizado em contrato.` },
  { q: 'O que eu contar fica em sigilo?', a: 'Sim. O sigilo profissional é um dever do advogado e vale para tudo o que você compartilhar, inclusive na primeira conversa.' },
];
