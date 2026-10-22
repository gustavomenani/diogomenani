import { readdirSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';

const SRC = new URL('../', import.meta.url);

/** O CSS de cada arquivo: as folhas de estilo e o <style> dos componentes, layouts e páginas. */
function styleSources(): { file: string; css: string }[] {
  return readdirSync(SRC, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => /\.(astro|css)$/.test(file))
    .map((file) => ({ file, css: readFileSync(new URL(file, SRC), 'utf8') }));
}

/**
 * Pares de faixas com lacuna de 1 px num arquivo: uma media query que termina em "width <= 959px"
 * e outra que começa em "width >= 960px" (ou "960px <= width"). Com zoom ou escala de tela, a
 * largura pode ser fracionária, e entre 959 e 960 px nenhuma das duas vale. A faixa de baixo usa
 * "<": "width < 960px". Só no mesmo arquivo: a regra de um componente que termina onde a de outro
 * começa não é um par.
 */
function mediaGaps(css: string): string[] {
  const queries = [...css.matchAll(/@media([^{]+)\{/g)].map(([, query = '']) => query);
  const bounds = (pattern: RegExp) =>
    new Set(
      queries.flatMap((query) =>
        [...query.matchAll(pattern)].map(({ groups }) => `${groups?.axis}:${groups?.px}`),
      ),
    );
  const uppers = bounds(/(?<axis>width|height)\s*<=\s*(?<px>\d+)px/g);
  const lowers = new Set([
    ...bounds(/(?<axis>width|height)\s*>=\s*(?<px>\d+)px/g),
    ...bounds(/(?<px>\d+)px\s*<=\s*(?<axis>width|height)/g),
  ]);
  return [...uppers]
    .map((bound) => bound.split(':'))
    .filter(([axis, px]) => lowers.has(`${axis}:${Number(px) + 1}`))
    .map(([axis, px]) => `${axis} <= ${px}px e ${axis} >= ${Number(px) + 1}px`);
}

test('as faixas complementares das media queries não deixam lacuna de 1 px', () => {
  // mata: o "width <= 959px" do Hero.astro, contra o "width >= 960px": a 959,2 px (janela de 1199
  // px com a escala de 125% do Windows), nenhuma valia, e a Têmis aparecia opaca por cima dos temas.
  // O Playwright não emula largura fracionária: o teste é sobre o CSS.
  const sources = styleSources();
  expect(sources.length).toBeGreaterThan(10);
  const gaps = sources.flatMap(({ file, css }) => mediaGaps(css).map((gap) => `${file}: ${gap}`));
  expect(gaps).toEqual([]);
});
