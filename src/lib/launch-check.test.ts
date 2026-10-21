import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, test } from 'vitest';
import { checkHtml, findPlaceholders } from './launch-check';

describe('findPlaceholders', () => {
  test('acha texto entre colchetes', () => {
    expect(findPlaceholders('Atuo em [Cidade/UF], OAB [000.000]')).toEqual([
      '[Cidade/UF]',
      '[000.000]',
    ]);
    expect(findPlaceholders('[contato@seudominio.adv.br]')).toEqual([
      '[contato@seudominio.adv.br]',
    ]);
  });

  test('ignora colchetes vazios, arrays JSON e sem letra ou dígito', () => {
    expect(findPlaceholders('[]')).toEqual([]);
    expect(findPlaceholders('["a","b"]')).toEqual([]);
    expect(findPlaceholders('[ - ]')).toEqual([]);
  });

  test('ignora trechos com mais de 80 caracteres', () => {
    expect(findPlaceholders(`[${'a'.repeat(81)}]`)).toEqual([]);
    expect(findPlaceholders(`[${'a'.repeat(80)}]`)).toHaveLength(1);
  });
});

const page = (body: string, head = '') =>
  `<!doctype html><html><head><title>t</title>${head}</head><body>${body}</body></html>`;
const canonical = '<link rel="canonical" href="https://exemplo.adv.br/">';

describe('checkHtml', () => {
  test('não examina o conteúdo de script comum nem de style', () => {
    const html = page(
      '<p>ok</p><script>const a = [0]; const b = [1];</script><style>[aria-hidden]{display:none}</style>',
      canonical,
    );
    expect(checkHtml('index.html', html, { isHome: true })).toEqual([]);
  });

  test('pega placeholder no texto', () => {
    const issues = checkHtml('index.html', page('<p>Escritório em [Cidade/UF]</p>', canonical), {
      isHome: true,
    });
    expect(issues).toEqual([{ file: 'index.html', kind: 'placeholder', excerpt: '[Cidade/UF]' }]);
  });

  test('pega placeholder em valor de atributo', () => {
    const html = page(
      '<button aria-label="[x]">a</button>',
      `<meta content="OAB/[UF]">${canonical}`,
    );
    const excerpts = checkHtml('p.html', html, { isHome: true }).map((i) => i.excerpt);
    expect(excerpts).toContain('[UF]');
    expect(excerpts).toContain('[x]');
  });

  test('pega placeholder em valor do JSON-LD, mas não reprova arrays', () => {
    const ld = (json: string) =>
      page('<p>ok</p>', `<script type="application/ld+json">${json}</script>${canonical}`);
    const sujo = checkHtml('index.html', ld('{"address":"[Rua]"}'), { isHome: true });
    expect(sujo).toEqual([{ file: 'index.html', kind: 'placeholder', excerpt: '[Rua]' }]);
    const limpo = checkHtml('index.html', ld('{"sameAs":["https://a"],"n":[1,2]}'), {
      isHome: true,
    });
    expect(limpo).toEqual([]);
  });

  test('pega o domínio de exemplo', () => {
    const html = page('<a href="mailto:a@seudominio.adv.br">e</a>', canonical);
    const kinds = checkHtml('index.html', html, { isHome: true }).map((i) => i.kind);
    expect(kinds).toEqual(['example-domain']);
    // O trecho vem do texto, sem restos de tags.
    const texto = page('<p><b>Email</b> a@seudominio.adv.br</p>', canonical);
    expect(checkHtml('index.html', texto, { isHome: true })[0]?.excerpt).not.toContain('<');
  });

  test('pega o LinkedIn genérico, mas não um perfil', () => {
    const generico = page('<a href="https://linkedin.com/">in</a>', canonical);
    expect(checkHtml('index.html', generico, { isHome: true }).map((i) => i.kind)).toEqual([
      'generic-linkedin',
    ]);
    const perfil = page('<a href="https://linkedin.com/in/fulano">in</a>', canonical);
    expect(checkHtml('index.html', perfil, { isHome: true })).toEqual([]);
  });

  test('na home, exige o canonical; fora dela, não', () => {
    const html = page('<p>ok</p>');
    expect(checkHtml('index.html', html, { isHome: true })).toEqual([
      { file: 'index.html', kind: 'missing-canonical', excerpt: '<link rel="canonical">' },
    ]);
    expect(checkHtml('404.html', html, { isHome: false })).toEqual([]);
    expect(checkHtml('index.html', page('<p>ok</p>', canonical), { isHome: true })).toEqual([]);
  });
});

describe('scripts/check-launch.ts', () => {
  const script = fileURLToPath(new URL('../../scripts/check-launch.ts', import.meta.url));
  const dirs: string[] = [];
  const dist = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'check-launch-'));
    dirs.push(dir);
    for (const [name, content] of Object.entries(files)) {
      mkdirSync(join(dir, name, '..'), { recursive: true });
      writeFileSync(join(dir, name), content);
    }
    return dir;
  };
  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  test('sai com 0 e "Pronto para publicar." quando está limpo', () => {
    const dir = dist({
      'index.html': page('<p>ok</p>', canonical),
      'privacidade/index.html': page('<p>ok</p>'),
    });
    const out = execFileSync(process.execPath, [script, dir], { encoding: 'utf8' });
    expect(out).toContain('Pronto para publicar.');
  });

  test('sai com 1 e lista arquivo, tipo e trecho quando está sujo', () => {
    const dir = dist({
      'index.html': page('<p>ok</p>', canonical),
      'privacidade/index.html': page('<p>[Cidade/UF]</p>'),
    });
    const r = spawnSync(process.execPath, [script, dir], { encoding: 'utf8' });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain(`${join('privacidade', 'index.html')}: placeholder: [Cidade/UF]`);
    expect(r.stdout).not.toContain('Pronto para publicar.');
  });
});
