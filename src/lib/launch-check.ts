// Regras da checagem de lançamento (npm run check:launch). Lógica pura sobre o HTML do build, sem
// parser: o HTML do Astro é regular o bastante para tags, atributos e blocos <script>/<style>.
export interface LaunchIssue {
  file: string;
  kind: 'placeholder' | 'example-domain' | 'generic-linkedin' | 'missing-canonical';
  excerpt: string;
}

// `[` + 1 a 80 caracteres sem `[]{}<>"` e com ao menos uma letra ou dígito + `]`. Fora do padrão
// ficam `[]`, os arrays do JSON (`["a"]`) e colchetes de pontuação.
const PLACEHOLDER = /\[(?=[^[\]{}<>"]{1,80}\])[^[\]{}<>"]*[\p{L}\p{N}][^[\]{}<>"]*\]/gu;
const EXAMPLE_DOMAIN = /seudominio/i;
const GENERIC_LINKEDIN = /https?:\/\/(?:www\.)?linkedin\.com\/?(?![\w/.-])/i;

export function findPlaceholders(text: string): string[] {
  return text.match(PLACEHOLDER) ?? [];
}

const JSON_LD =
  /<script\b[^>]*\btype\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script\s*>/gi;
const SCRIPT_OR_STYLE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const COMMENT = /<!--[\s\S]*?-->/g;
const TAG = /<\/?[a-z][^\s/>]*(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
const ATTRIBUTE = /\s[^\s"'<>/=]+\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;

const ENTITIES: Record<string, string> = { quot: '"', amp: '&', lt: '<', gt: '>', apos: "'" };
const decode = (text: string) =>
  text.replace(
    /&(?:#(\d+)|#x([\da-f]+)|(quot|amp|lt|gt|apos));/gi,
    (_: string, dec?: string, hex?: string, name?: string) =>
      dec !== undefined
        ? String.fromCodePoint(Number(dec))
        : hex !== undefined
          ? String.fromCodePoint(Number.parseInt(hex, 16))
          : (ENTITIES[(name ?? '').toLowerCase()] ?? ''),
  );

function jsonStrings(value: unknown, out: string[]): void {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) for (const item of value) jsonStrings(item, out);
  else if (value !== null && typeof value === 'object')
    for (const item of Object.values(value)) jsonStrings(item, out);
}

/** Todo texto que o visitante ou um robô lê: texto da página, valores de atributos e strings do JSON-LD. */
function visibleStrings(html: string): string[] {
  const strings: string[] = [];
  for (const [, json] of html.matchAll(JSON_LD)) {
    try {
      jsonStrings(JSON.parse(json ?? ''), strings);
    } catch {
      strings.push(json ?? '');
    }
  }
  const body = html.replace(COMMENT, '').replace(SCRIPT_OR_STYLE, '');
  for (const [tag] of body.matchAll(TAG)) {
    for (const match of tag.matchAll(ATTRIBUTE)) {
      strings.push(decode(match[1] ?? match[2] ?? match[3] ?? ''));
    }
  }
  strings.push(decode(body.replace(TAG, ' ')));
  return strings;
}

const around = (text: string, index: number, length: number) =>
  text
    .slice(Math.max(0, index - 20), index + length + 20)
    .replace(/\s+/g, ' ')
    .trim();

export function checkHtml(file: string, html: string, options: { isHome: boolean }): LaunchIssue[] {
  const issues: LaunchIssue[] = [];
  const add = (kind: LaunchIssue['kind'], excerpt: string) => issues.push({ file, kind, excerpt });

  for (const text of visibleStrings(html)) {
    for (const found of findPlaceholders(text)) add('placeholder', found);
    const domain = EXAMPLE_DOMAIN.exec(text);
    if (domain) add('example-domain', around(text, domain.index, domain[0].length));
    const linkedin = GENERIC_LINKEDIN.exec(text);
    if (linkedin) add('generic-linkedin', linkedin[0]);
  }

  if (options.isHome && !/<link\b[^>]*\brel\s*=\s*["']?canonical\b/i.test(html)) {
    add('missing-canonical', '<link rel="canonical">');
  }
  return issues;
}
