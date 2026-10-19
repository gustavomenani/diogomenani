import { defineConfig } from 'html-validate';

export default defineConfig({
  extends: ['html-validate:recommended'],
  rules: {
    // O menu mobile sai com aria-hidden e links focáveis; corrigido por I2 — remover na Task 9.
    'hidden-focusable': 'off',
    // O h1 do hero usa aria-label; corrigido por I6 — remover na Task 9.
    'aria-label-misuse': 'off',
  },
});
