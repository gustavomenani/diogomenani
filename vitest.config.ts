/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Temporário: ainda não há testes unitários; sai na Task 5.
    passWithNoTests: true,
  },
});
