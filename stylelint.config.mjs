/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  ignoreFiles: ['dist/**', '.astro/**', 'node_modules/**'],
  rules: {
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    // O Safari ainda exige o prefixo -webkit- nestas propriedades.
    'property-no-vendor-prefix': [
      true,
      { ignoreProperties: ['-webkit-text-size-adjust', '-webkit-user-select'] },
    ],
    // Palavras-chave herdadas do SVG ficam na grafia original: currentColor, optimizeLegibility.
    'value-keyword-case': ['lower', { camelCaseSvgKeywords: true }],
    // Tamanhos de texto só da escala de tokens.css (--fs-*); os títulos fluidos usam clamp().
    'declaration-property-value-allowed-list': {
      'font-size': [/^var\(--fs-/, /^clamp\(/, 'inherit', '1em'],
    },
    // Desligada: acusa pares que nunca disputam o mesmo elemento e a mesma propriedade (`.nav
    // a:hover` contra `.menu-nav a`, as listas de seletores do foco e da seleção). Religada na
    // revisão final, mostrou sete casos assim e um real, já corrigido (hover num campo com erro).
    'no-descending-specificity': null,
  },
};
