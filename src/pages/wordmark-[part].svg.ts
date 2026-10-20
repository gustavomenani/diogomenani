import type { APIRoute, GetStaticPaths } from 'astro';
import { wordmark } from '../data/brand';

/**
 * Assinatura do rodapé como arquivo (`/wordmark-name.svg` e `/wordmark-sub.svg`), gerada de
 * `wordmark` em brand.ts: fora do HTML, vai para o cache do navegador. São dois arquivos porque
 * no rodapé cada linha tem a própria largura e o espaço entre elas é fixo.
 */
type Part = (typeof wordmark)[keyof typeof wordmark];

export const getStaticPaths = (() =>
  (Object.keys(wordmark) as (keyof typeof wordmark)[]).map((part) => ({
    params: { part },
    props: wordmark[part],
  }))) satisfies GetStaticPaths;

export const GET: APIRoute<Part> = ({ props: { viewBox, d } }) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><path fill="#fff" d="${d}"/></svg>\n`;
  return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
};
