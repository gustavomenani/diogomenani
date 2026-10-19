import { defineConfig } from 'html-validate';

export default defineConfig({
  extends: ['html-validate:recommended'],
  rules: {
    // Só índices de animação em linha (custom properties); estilo de verdade fica no CSS.
    'no-inline-style': ['error', { allowedProperties: ['--i', '--line', '--word'] }],
  },
});
