/**
 * Atributos de link que abre em outra aba sem dar à página aberta acesso a esta.
 *
 * É uma função, e não um objeto compartilhado, de propósito: ao espalhar atributos
 * (`{...externalLink()}`) num componente com estilo escopado, o Astro grava a classe de escopo
 * no próprio objeto espalhado. Um objeto único acumularia as classes de todos os usos.
 *
 * Nos componentes, use o `ExternalLink.astro`, que também avisa o leitor de tela.
 */
export function externalLink(): { target: '_blank'; rel: 'noopener' } {
  return { target: '_blank', rel: 'noopener' };
}

/** O aviso que o leitor de tela ouve no fim de um link que abre em outra aba. */
export const NEW_TAB_NOTE = '(abre em outra aba)';

/** Nome acessível de um link que abre em outra aba: o rótulo seguido do aviso. */
export function newTabLabel(label: string): string {
  return `${label} ${NEW_TAB_NOTE}`;
}
