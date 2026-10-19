// @ts-check
import js from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import astro from 'eslint-plugin-astro';
import playwright from 'eslint-plugin-playwright';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores([
    'dist/',
    '.astro/',
    'test-results/',
    'playwright-report/',
    'blob-report/',
    '.superpowers/',
  ]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.astro'],
      },
    },
    rules: {
      // Números em template strings (px, ms, índices) são legíveis e seguros.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  astro.configs.recommended,
  astro.configs['jsx-a11y-strict'],
  {
    // O astro-eslint-parser não suporta o project service; ele lê o tsconfig diretamente.
    files: ['**/*.astro'],
    languageOptions: {
      parserOptions: { projectService: false, project: './tsconfig.json' },
    },
    rules: {
      // O programa do typescript-eslint não resolve o tipo dos elementos JSX do Astro, então todo
      // `.map(() => <li />)` vira "retorno de tipo error". Os tipos do template são checados pelo
      // `astro check` (strictest); as demais regras no-unsafe-* continuam ativas.
      '@typescript-eslint/no-unsafe-return': 'off',
      // role="list" em <ul> é de propósito: o VoiceOver tira a semântica de lista das listas com
      // list-style: none. Os outros papéis redundantes continuam proibidos.
      'astro/jsx-a11y/no-redundant-roles': ['error', { ul: ['list'] }],
    },
  },
  {
    // Os <script> dos .astro viram arquivos virtuais (*.astro/*.ts) fora do programa do TypeScript.
    // Com checagem de tipos o parse falha e o processador do Astro descarta o erro em silêncio;
    // sem ela, as regras sintáticas rodam. O código de verdade fica em src/scripts/, com tipos.
    files: ['**/*.astro/*.ts', '**/*.astro/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { parserOptions: { projectService: false, project: null } },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['tests/**/*.ts'],
    extends: [playwright.configs['flat/recommended']],
    rules: {
      'playwright/expect-expect': ['warn', { assertFunctionNames: ['expectExternalLink'] }],
      // Skip condicional é a forma de declarar o motor (CDP só no Chromium, Tab no Safari).
      'playwright/no-skipped-test': ['warn', { allowConditional: true }],
    },
  },
  {
    files: ['src/**/*.test.ts'],
    extends: [vitest.configs.recommended],
  },
  prettier,
);
