// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

/**
 * Intervalo do subconjunto latin do Google Fonts, que cobre todo o português. Os arquivos em
 * src/assets/fonts são os que o Google servia, com a licença OFL de cada família ao lado.
 * @type {[string, ...string[]]}
 */
const LATIN = [
  'U+0000-00FF',
  'U+0131',
  'U+0152-0153',
  'U+02BB-02BC',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+0304',
  'U+0308',
  'U+0329',
  'U+2000-206F',
  'U+20AC',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
  'U+FEFF',
  'U+FFFD',
];

export default defineConfig({
  // Escopo dos <style> dos componentes via :where(): não acrescenta especificidade, então a
  // cascata segue exatamente o que está escrito no CSS.
  scopedStyleStrategy: 'where',
  // Fontes servidas pelo próprio site. O Astro gera os @font-face, os preloads do <Font> e
  // fallbacks com métricas ajustadas (o texto não pula quando a fonte chega).
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Baskervville',
      cssVariable: '--font-baskervville',
      fallbacks: ['Baskerville', 'Baskerville Old Face', 'Georgia', 'serif'],
      unicodeRange: LATIN,
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/baskervville-normal-latin.woff2'],
            weight: '400 700',
            style: 'normal',
          },
          {
            src: ['./src/assets/fonts/baskervville-italic-latin.woff2'],
            weight: '400 700',
            style: 'italic',
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Hanken Grotesk',
      cssVariable: '--font-hanken',
      fallbacks: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      unicodeRange: LATIN,
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/hanken-grotesk-normal-latin.woff2'],
            weight: '400 700',
            style: 'normal',
          },
        ],
      },
    },
  ],
  // Quando o site tiver domínio, informe aqui (o Astro usa em URLs absolutas):
  // site: 'https://www.seudominio.adv.br',
});
