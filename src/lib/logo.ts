// O logo, completo ou compacto, como SVG avulso, montado com os vetores e as medidas de
// src/data/brand.ts.
import {
  logoLayouts,
  logoTones,
  monogram,
  wordmark,
  type LogoTone,
  type LogoVariant,
} from '../data/brand';

/** Altura de uma peça na largura dada, pela proporção do seu viewBox. */
function heightAt(viewBox: string, width: number): number {
  const [, , w = 1, h = 0] = viewBox.split(' ').map(Number);
  return Number(((width * h) / w).toFixed(2));
}

/** Uma peça (monograma ou linha da assinatura) posicionada dentro do logo. */
function piece(
  part: { viewBox: string; d: string },
  box: { x: number; y: number; width: number },
  fill: string,
): string {
  const height = heightAt(part.viewBox, box.width);
  return `<svg x="${box.x}" y="${box.y}" width="${box.width}" height="${height}" viewBox="${part.viewBox}"><path fill="${fill}" d="${part.d}"/></svg>`;
}

/** Caminho do arquivo do logo: /logo-blue.svg, /logo-compact-white.svg etc. */
export function logoPath(tone: LogoTone, variant: LogoVariant = 'full'): string {
  return variant === 'full' ? `/logo-${tone}.svg` : `/logo-${variant}-${tone}.svg`;
}

/** O arquivo SVG do logo na versão e na cor pedidas. */
export function logoSvg(tone: LogoTone, variant: LogoVariant = 'full'): string {
  const colors = logoTones[tone];
  const { width, height, mark, rule, name, sub } = logoLayouts[variant];
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">` +
    `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${colors.rule}" stop-opacity="0"/>` +
    `<stop offset="0.45" stop-color="${colors.rule}"/>` +
    `<stop offset="0.82" stop-color="${colors.rule}"/>` +
    `<stop offset="1" stop-color="${colors.rule}" stop-opacity="0"/>` +
    `</linearGradient>` +
    piece(monogram, mark, colors.mark) +
    `<rect x="${rule.x}" y="0" width="${rule.width}" height="${height}" fill="url(#fade)"/>` +
    piece(wordmark.name, name, colors.text) +
    piece(wordmark.sub, sub, colors.text) +
    `</svg>\n`
  );
}
