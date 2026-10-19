/**
 * Atributos de link que abre em outra aba sem dar à página aberta acesso a esta.
 *
 * É uma função, e não um objeto compartilhado, de propósito: ao espalhar atributos
 * (`{...externalLink()}`) num componente com estilo escopado, o Astro grava a classe de escopo
 * no próprio objeto espalhado. Um objeto único acumularia as classes de todos os usos.
 */
export function externalLink(): { target: '_blank'; rel: 'noopener' } {
  return { target: '_blank', rel: 'noopener' };
}
