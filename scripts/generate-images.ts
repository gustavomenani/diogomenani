// Gera as imagens de public/ que precisam ser PNG: o favicon de 32 px, o ícone da tela de início
// do iOS e a prévia dos links (og.png, 1200×630). O Chromium do Playwright desenha os vetores da
// marca com as cores de tokens.css. Rode de novo quando a marca mudar: npm run generate:images.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { monogram, wordmark } from '../src/data/brand.ts';

interface Shot {
  file: string;
  width: number;
  height: number;
  /** Fundo transparente (o favicon tem cantos arredondados). */
  transparent?: boolean;
  css: string;
  html: string;
}

const root = new URL('../', import.meta.url);
const tokens = await readFile(new URL('src/styles/tokens.css', root), 'utf8');
const favicon = await readFile(new URL('public/favicon.svg', root));
const faviconSrc = `data:image/svg+xml;base64,${favicon.toString('base64')}`;

const svg = (viewBox: string, d: string, className: string) =>
  `<svg class="${className}" viewBox="${viewBox}"><path fill="currentColor" d="${d}"></path></svg>`;

const shots: Shot[] = [
  {
    file: 'favicon-32.png',
    width: 32,
    height: 32,
    transparent: true,
    css: 'img { width: 32px; height: 32px; }',
    html: `<img src="${faviconSrc}" alt="">`,
  },
  {
    // O iOS não aceita transparência e arredonda os cantos sozinho: fundo royal de ponta a ponta
    // e o favicon com 20 px de margem.
    file: 'apple-touch-icon.png',
    width: 180,
    height: 180,
    css: 'body { padding: 20px; background: var(--royal); } img { width: 140px; height: 140px; }',
    html: `<img src="${faviconSrc}" alt="">`,
  },
  {
    // A assinatura do rodapé (.footer-brand do Footer.astro, sem a Têmis), com as medidas do
    // desktop ampliadas 1,5× pelo zoom e centralizada sobre o royal.
    file: 'og.png',
    width: 1200,
    height: 630,
    css: `
      body { display: grid; place-items: center; background: var(--royal); color: #fff; }
      .brand { zoom: 1.5; width: 800px; display: flex; flex-direction: column; align-items: center; }
      .mark { width: 136px; height: auto; }
      .rule {
        display: block;
        width: min(620px, 86%);
        height: 5px;
        margin: 26px 0 22px;
        border-radius: 5px;
        background: linear-gradient(
          90deg,
          rgb(255 255 255 / 0%) 0%,
          rgb(255 255 255 / 50%) 22%,
          #fff 46%,
          #fff 86%,
          rgb(255 255 255 / 0%) 100%
        );
        filter: drop-shadow(0 0 7px var(--rule-glow));
      }
      .name { width: min(560px, 84%); height: auto; }
      .sub { width: min(470px, 70%); height: auto; margin-top: 14px; }`,
    html: `<div class="brand">
      ${svg(monogram.viewBox, monogram.d, 'mark')}
      <span class="rule"></span>
      ${svg(wordmark.name.viewBox, wordmark.name.d, 'name')}
      ${svg(wordmark.sub.viewBox, wordmark.sub.d, 'sub')}
    </div>`,
  },
];

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const shot of shots) {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    // setContent espera o load: as imagens em data: já estão desenhadas na captura.
    await page.setContent(`<!doctype html>
      <html>
        <head>
          <style>
            ${tokens}
            * { margin: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            img, svg { display: block; }
            ${shot.css}
          </style>
        </head>
        <body>${shot.html}</body>
      </html>`);
    const path = fileURLToPath(new URL(`public/${shot.file}`, root));
    await page.screenshot({ path, omitBackground: shot.transparent ?? false });
    console.log(`public/${shot.file} (${shot.width}×${shot.height})`);
  }
} finally {
  await browser.close();
}
