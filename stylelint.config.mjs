/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard', 'stylelint-config-html/astro'],
  ignoreFiles: [
    'dist/**',
    '.astro/**',
    'node_modules/**',
    // Temporário: o CSS é reorganizado e modernizado na Task 7.
    'src/styles/global.css',
  ],
  rules: {
    'selector-pseudo-class-no-unknown': [true, { ignorePseudoClasses: ['global'] }],
    // O Safari ainda exige o prefixo -webkit- nestas propriedades.
    'property-no-vendor-prefix': [true, { ignoreProperties: ['text-size-adjust', 'user-select'] }],
  },
};
