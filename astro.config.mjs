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
  // Todo o CSS vai embutido no HTML: é uma página só, e a primeira pintura não espera um segundo
  // arquivo (em 4G lento, ~0,7 s antes).
  build: { inlineStylesheets: 'always' },
  // Navegadores-alvo do CSS (os da spec da rodada 2: Chrome, Edge e Firefox recentes e
  // Safari/iOS 16.4+). O Astro fixa o build em 'esnext', e sem isto o Lightning CSS minifica sem
  // alvo nenhum: junta text-decoration com a espessura e a cor num atalho que o Safari só aceita
  // a partir do 26.2 (antes disso a declaração inteira cai e o link perde o sublinhado) e tira os
  // prefixos -webkit-mask-*.
  vite: { build: { cssTarget: ['chrome111', 'edge111', 'firefox114', 'safari16.4', 'ios16.4'] } },
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
  // Quando o site tiver domínio, informe aqui. Ele liga o que exige endereço absoluto: o
  // canonical, o og:url, a imagem de prévia dos links (og:image), o url e o image do JSON-LD e o
  // sitemap (as páginas no sitemap.xml e a linha Sitemap: do robots.txt). Sem ele, essas partes
  // simplesmente não saem.
  // site: 'https://www.seudominio.adv.br',
});
