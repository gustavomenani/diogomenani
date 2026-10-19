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
    // Nomes de fonte (Didot, Georgia…) nos tokens de família tipográfica não são palavras-chave.
    'value-keyword-case': [
      'lower',
      { camelCaseSvgKeywords: true, ignoreProperties: ['--serif', '--sans'] },
    ],
    // A regra compara só o último seletor composto e acusa elementos diferentes (`.nav a:hover`
    // contra `.menu-nav a`); reordenar para agradá-la mexeria na cascata. A ordem dos estilos foi
    // verificada contra o site original com estilos computados.
    'no-descending-specificity': null,
  },
};
