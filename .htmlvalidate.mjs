import { defineConfig } from 'html-validate';

export default defineConfig({
  // document: confere também as referências (for, aria-*, ids) e os rótulos dos campos.
  extends: ['html-validate:recommended', 'html-validate:document'],
  rules: {
    // Só índices de animação em linha (custom properties); estilo de verdade fica no CSS.
    'no-inline-style': ['error', { allowedProperties: ['--i', '--row', '--word'] }],
    // Integridade (SRI) só para arquivos de outra origem; os do próprio site não precisam.
    'require-sri': ['error', { target: 'crossorigin' }],
  },
});
