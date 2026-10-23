/** Ícones Tabler (tabler.io/icons, licença MIT em MIT-tabler-icons.txt), no mesmo traço. */
export const iconPaths = {
  whatsapp: [
    'M3 21l1.65 -3.8a9 9 0 1 1 3.4 2.9l-5.05 .9',
    'M9 10a.5 .5 0 0 0 1 0v-1a.5 .5 0 0 0 -1 0v1a5 5 0 0 0 5 5h1a.5 .5 0 0 0 0 -1h-1a.5 .5 0 0 0 0 1',
  ],
  'arrow-up-right': ['M17 7l-10 10', 'M8 7l9 0l0 9'],
  'arrow-right': ['M5 12l14 0', 'M13 18l6 -6', 'M13 6l6 6'],
  mail: [
    'M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z',
    'M3 7l9 6l9 -6',
  ],
  clock: ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 7v5l3 3'],
  instagram: [
    'M4 8a4 4 0 0 1 4 -4h8a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-8a4 4 0 0 1 -4 -4z',
    'M9 12a3 3 0 1 0 6 0a3 3 0 0 0 -6 0',
    'M16.5 7.5v.01',
  ],
  tiktok: [
    'M21 7.917v4.034a9.948 9.948 0 0 1 -5 -1.951v4.5a6.5 6.5 0 1 1 -8 -6.326v4.326a2.5 2.5 0 1 0 4 2v-11.5h4.083a6.005 6.005 0 0 0 4.917 4.917',
  ],
  facebook: ['M7 10v4h3v7h4v-7h3l1 -4h-4v-2a1 1 0 0 1 1 -1h3v-4h-3a5 5 0 0 0 -5 5v2h-3'],
  'arrow-up': ['M12 5l0 14', 'M18 11l-6 -6', 'M6 11l6 -6'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof iconPaths;
