// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Escopo dos <style> dos componentes via :where(): não acrescenta especificidade, então a
  // cascata segue exatamente o que está escrito no CSS.
  scopedStyleStrategy: 'where',
  // Quando o site tiver domínio, informe aqui (usado em URLs absolutas e no sitemap):
  // site: 'https://www.seudominio.adv.br',
});
