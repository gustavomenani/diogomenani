// Examina os .html de um build e barra o que não pode ir ao ar: placeholders, domínio de exemplo,
// LinkedIn genérico e falta de canonical (site ausente). Uso: npm run check:launch.
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { checkHtml } from '../src/lib/launch-check.ts';

const dir = resolve(process.argv[2] ?? 'dist');
const entries = await readdir(dir, { recursive: true });
const files = entries.filter((entry) => entry.endsWith('.html')).sort();

const lines: string[] = [];
for (const file of files) {
  const html = await readFile(join(dir, file), 'utf8');
  const isHome = relative(dir, join(dir, file)) === 'index.html';
  for (const issue of checkHtml(file, html, { isHome })) {
    lines.push(`${issue.file}: ${issue.kind}: ${issue.excerpt}`);
  }
}

if (lines.length > 0) {
  console.log(lines.join('\n'));
  console.log(`\n${lines.length} problema(s) para resolver antes de publicar.`);
  process.exitCode = 1;
} else {
  console.log('Pronto para publicar.');
}
