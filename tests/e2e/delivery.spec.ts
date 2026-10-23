import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { logoLayouts, monogram, wordmark } from '../../src/data/brand';
import { test, expect, type Page } from './fixtures';

/** Regra de cache dos assets com hash no nome: nunca mudam, então o navegador guarda por 1 ano. */
const LONG_CACHE = 'public, max-age=31536000, immutable';

/**
 * Regra de cache do logo e da assinatura, que têm nome fixo: um dia, e depois o navegador mostra a
 * cópia guardada enquanto revalida em segundo plano.
 */
const BRAND_CACHE = 'public, max-age=86400, stale-while-revalidate=604800';

const DIST = new URL('../../dist/', import.meta.url);

interface VercelConfig {
  trailingSlash?: boolean;
  headers?: { source: string; headers: { key: string; value: string }[] }[];
}

/** O vercel.json da raiz, que a Vercel lê. */
function readVercel(): VercelConfig {
  return JSON.parse(
    readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
  ) as VercelConfig;
}

/** O _headers publicado, que a Netlify e a Cloudflare Pages leem. */
function readHeadersFile(): string {
  return readFileSync(new URL('_headers', DIST), 'utf8');
}

/** Cabeçalhos de um bloco do _headers: o caminho numa linha e os cabeçalhos indentados abaixo. */
function headersBlock(text: string, path: string): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf(path);
  if (start < 0) return {};
  const headers: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    const match = /^[ \t]+([^:]+):\s*(.*)$/.exec(line);
    if (!match) break;
    headers[match[1] ?? ''] = match[2] ?? '';
  }
  return headers;
}

/** Os cabeçalhos de segurança da regra que vale para o site todo no vercel.json. */
function securityHeaders(): Record<string, string> {
  const rule = readVercel().headers?.find(({ source }) => source === '/(.*)');
  return Object.fromEntries((rule?.headers ?? []).map(({ key, value }) => [key, value]));
}

/** As páginas HTML do build, com o caminho relativo ao dist/ (barras normais). */
function distPages(): { file: string; html: string }[] {
  return readdirSync(DIST, { recursive: true, encoding: 'utf8' })
    .map((file) => file.replaceAll('\\', '/'))
    .filter((file) => file.endsWith('.html'))
    .map((file) => ({ file, html: readFileSync(new URL(file, DIST), 'utf8') }));
}

/** Largura e altura de um PNG, lidas do cabeçalho IHDR (logo depois da assinatura de 8 bytes). */
function pngSize(png: Buffer): { width: number; height: number } {
  return { width: png.readUInt32BE(16), height: png.readUInt32BE(20) };
}

test('o CSS vem embutido', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel=stylesheet]')).toHaveCount(0);
  const withTokens = await page
    .locator('style')
    .evaluateAll(
      (styles) => styles.filter((style) => style.textContent.includes('--royal')).length,
    );
  expect(withTokens).toBeGreaterThan(0);
});

test('favicons PNG e ícone do iOS', async ({ page, request }) => {
  await page.goto('/');
  const icons = [
    { link: 'link[rel=icon][type="image/png"][sizes="32x32"]', href: '/favicon-32.png', side: 32 },
    // O Google Search não aceita SVG e pede mais de 48 px.
    { link: 'link[rel=icon][type="image/png"][sizes="96x96"]', href: '/favicon-96.png', side: 96 },
    { link: 'link[rel=apple-touch-icon]', href: '/apple-touch-icon.png', side: 180 },
  ];
  for (const { link, href, side } of icons) {
    await expect(page.locator(link)).toHaveAttribute('href', href);
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toBe('image/png');
    expect(pngSize(await response.body()), href).toEqual({ width: side, height: side });
  }
});

test('/favicon.ico existe: navegadores e robôs o pedem direto, sem ler o HTML', async ({
  request,
}) => {
  const response = await request.get('/favicon.ico');
  expect(response.status()).toBe(200);
  // Cabeçalho ICO (reservado 0, tipo 1), com o PNG de 32 px dentro. O content-type fica de fora:
  // cada servidor serve .ico com um tipo diferente.
  const ico = await response.body();
  expect([...ico.subarray(0, 4)]).toEqual([0, 0, 1, 0]);
  expect(pngSize(ico.subarray(22))).toEqual({ width: 32, height: 32 });
});

test('imagem de prévia em 1200×630', async ({ request }) => {
  const response = await request.get('/og.png');
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('image/png');
  expect(pngSize(await response.body())).toEqual({ width: 1200, height: 630 });
});

test('wordmark servido como arquivo', async ({ request }) => {
  // Nome e linha de baixo em arquivos separados: no rodapé, cada um tem a própria largura e o
  // espaço entre eles é fixo, o que um SVG só não reproduz em todas as larguras de tela.
  for (const [href, part] of [
    ['/wordmark-name.svg', wordmark.name],
    ['/wordmark-sub.svg', wordmark.sub],
  ] as const) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toMatch(/^image\/svg\+xml\b/);
    const svg = await response.text();
    expect(svg, href).toContain(`viewBox="${part.viewBox}"`);
    expect(svg, href).toContain(part.d);
  }
  const html = await (await request.get('/')).text();
  expect(html).not.toContain(wordmark.name.d.slice(0, 40));
  expect(html).not.toContain(wordmark.sub.d.slice(0, 40));
});

test('logo servido como arquivo, nas versões oficial e compacta, azul e branca', async ({
  page,
  request,
}) => {
  for (const [href, color, layout] of [
    ['/logo-blue.svg', '#1500a0', logoLayouts.full],
    ['/logo-white.svg', '#fff', logoLayouts.full],
    ['/logo-compact-blue.svg', '#1500a0', logoLayouts.compact],
    ['/logo-compact-white.svg', '#fff', logoLayouts.compact],
  ] as const) {
    const response = await request.get(href);
    expect(response.status(), href).toBe(200);
    expect(response.headers()['content-type'], href).toMatch(/^image\/svg\+xml\b/);
    const svg = await response.text();
    expect(svg, href).toContain(`viewBox="0 0 ${layout.width} ${layout.height}"`);
    expect(svg, href).toContain(`<path fill="${color}" d="${monogram.d}"/>`);
  }
  // No header, a compacta: branca sobre o hero, azul com o header claro. No Sobre, a oficial azul.
  await page.goto('/');
  await expect(page.locator('[data-header] img[src="/logo-compact-white.svg"]')).toHaveCount(1);
  await expect(page.locator('[data-header] img[src="/logo-compact-blue.svg"]')).toHaveCount(1);
  await expect(page.locator('#sobre img[src="/logo-blue.svg"]')).toHaveCount(1);
});

test('monograma desenhado uma vez', async ({ request }) => {
  const html = await (await request.get('/')).text();
  const drawings = html.split(`d="${monogram.d}"`).length - 1;
  expect(drawings).toBe(1);
});

test('cache longo dos assets declarado', () => {
  // Netlify (e Cloudflare Pages) leem o _headers publicado; a Vercel lê o vercel.json da raiz.
  const headers = readHeadersFile();
  expect(headers).toMatch(
    new RegExp(`^/_astro/\\*\\r?\\n[ \\t]+Cache-Control: ${LONG_CACHE}\\r?$`, 'm'),
  );

  expect(readVercel().headers).toContainEqual({
    source: '/_astro/(.*)',
    headers: [{ key: 'Cache-Control', value: LONG_CACHE }],
  });
});

test('cache do logo e da assinatura declarado', () => {
  // Sem regra, as hospedagens respondem max-age=0: a cada visita, o logo do header espera um 304
  // e aparece um round trip depois do resto da página.
  const headers = readHeadersFile();
  for (const path of ['/logo-*', '/wordmark-*']) {
    expect(headersBlock(headers, path), path).toEqual({ 'Cache-Control': BRAND_CACHE });
  }
  expect(readVercel().headers).toContainEqual({
    source: '/(logo|wordmark)-(.*)\\.svg',
    headers: [{ key: 'Cache-Control', value: BRAND_CACHE }],
  });
});

test('a Vercel redireciona para a URL com barra, a que o build gera', () => {
  // O build gera privacidade/index.html. Sem o trailingSlash, a Vercel responderia 200 nas duas
  // formas e a URL ficaria duplicada; a Netlify e a Cloudflare Pages já redirecionam sozinhas.
  expect(readVercel().trailingSlash).toBe(true);
  expect(distPages().map(({ file }) => file)).toContain('privacidade/index.html');
});

test('cabeçalhos de segurança iguais no vercel.json e no _headers', () => {
  const fromVercel = securityHeaders();
  expect(Object.keys(fromVercel).sort()).toEqual(
    [
      'Content-Security-Policy',
      'Cross-Origin-Opener-Policy',
      'Permissions-Policy',
      'Referrer-Policy',
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
    ].sort(),
  );
  expect(headersBlock(readHeadersFile(), '/*')).toEqual(fromVercel);
});

/** Hash ('sha256-…') de cada script inline do build. O JSON-LD é dado, não roda: fica de fora. */
function inlineScriptHashes(): Set<string> {
  const scripts = distPages().flatMap(({ html }) => [
    ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
  ]);
  return new Set(
    scripts
      .filter(([, attributes = '']) => !/\bsrc=|application\/ld\+json/.test(attributes))
      .map(([, , body = '']) => `'sha256-${createHash('sha256').update(body).digest('base64')}'`),
  );
}

/** As fontes de uma diretiva da CSP do vercel.json ("script-src" → ["'self'", …]). */
function cspSources(directive: string): string[] {
  const found = (securityHeaders()['Content-Security-Policy'] ?? '')
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([name]) => name === directive);
  return found?.slice(1) ?? [];
}

test('hash do script inline está na CSP', () => {
  // Mexer num script is:inline (o do Base.astro ou o do privacidade.astro) sem trocar o hash o
  // bloquearia em produção (o preview não aplica a CSP). E um hash que sobrou de uma versão antiga
  // liberaria um script que não existe mais.
  const inline = inlineScriptHashes();
  expect(inline.size).toBeGreaterThan(0);
  expect(
    cspSources('script-src')
      .filter((source) => source.startsWith("'sha256-"))
      .sort(),
  ).toEqual([...inline].sort());
});

/**
 * O que o CSS de uma página tem de errado para os navegadores-alvo: espessura no atalho
 * text-decoration, atalho com cor sem o -webkit-text-decoration ao lado e máscara sem o prefixo.
 */
function cssTargetProblems(html: string): string[] {
  const shorthands = [...html.matchAll(/(?<![\w-])text-decoration:([^;}]+)/g)].map(
    ([, value = '']) => value,
  );
  return [
    ...shorthands
      .filter((value) => value.split(/\s+/).some((token) => /^[\d.]+(px|em|rem|%)$/.test(token)))
      .map((value) => `espessura no atalho: text-decoration:${value}`),
    ...shorthands
      .filter((value) => value.trim().includes(' '))
      .filter((value) => !html.includes(`-webkit-text-decoration:${value}`))
      .map((value) => `sem -webkit-text-decoration: text-decoration:${value}`),
    ...(/[^-]mask-image:/.test(html) && !html.includes('-webkit-mask-image:')
      ? ['mask-image sem -webkit-mask-image']
      : []),
  ];
}

test('o CSS sai para os navegadores-alvo', () => {
  // Sem o cssTarget do astro.config.mjs, o Lightning CSS minifica sem alvo: põe a espessura no
  // atalho text-decoration ("underline 1px") e a cor sem o -webkit-text-decoration, que o Safari
  // anterior ao 26.2 recusa (a declaração cai e o link perde o sublinhado), e tira o -webkit-mask-*.
  const problems = distPages().flatMap(({ file, html }) =>
    cssTargetProblems(html).map((problem) => `${file}: ${problem}`),
  );
  expect(problems).toEqual([]);
});

/** Aplica a CSP do vercel.json às respostas HTML do preview, que não lê o vercel.json. */
async function applyCsp(page: Page): Promise<string> {
  // O upgrade-insecure-requests fica de fora: no preview em http, ele mandaria os pedidos para um
  // https que não existe. Em produção, o site é todo https.
  const csp = (securityHeaders()['Content-Security-Policy'] ?? '')
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive && directive !== 'upgrade-insecure-requests')
    .join('; ');
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    return route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': csp },
    });
  });
  return csp;
}

/** Guarda as violações da CSP desde o começo da página, para `cspViolations` ler depois. */
async function watchCspViolations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const found: string[] = [];
    Object.defineProperty(window, '__cspViolations', { value: found });
    document.addEventListener('securitypolicyviolation', (event) => {
      found.push(`${event.effectiveDirective}: ${event.blockedURI || event.sample}`);
    });
  });
}

function cspViolations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
}

test.describe('a CSP não bloqueia nada do site', () => {
  test('na home, o script inline e o módulo rodam, e nada é bloqueado', async ({ page }) => {
    const csp = await applyCsp(page);
    await watchCspViolations(page);
    const response = await page.goto('/');
    expect(response?.headers()['content-security-policy']).toBe(csp);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    // O script inline (liberado pelo hash) decidiu o modo, e o módulo da página terminou.
    const root = page.locator('[data-page]');
    await expect(root).toHaveAttribute('data-ready', '');
    await expect(root).not.toHaveAttribute('data-motion', 'pending');
    // Desce a página: as revelações e os style= das custom properties entram em jogo.
    await page.evaluate(async () => {
      for (let y = 0; y <= document.documentElement.scrollHeight; y += innerHeight / 2) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise(requestAnimationFrame);
      }
    });
    expect(await cspViolations(page)).toEqual([]);
  });

  for (const path of ['/privacidade/', '/nao-existe']) {
    test(`em ${path}, nada é bloqueado`, async ({ page }) => {
      const csp = await applyCsp(page);
      await watchCspViolations(page);
      const response = await page.goto(path);
      expect(response?.headers()['content-security-policy']).toBe(csp);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      expect(await cspViolations(page)).toEqual([]);
    });
  }

  test.describe('sem JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('o <style> do <noscript> vale: header que rola e botão Menu escondido', async ({
      page,
    }) => {
      await applyCsp(page);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto('/');
      await expect(page.locator('.site-header')).toHaveCSS('position', 'absolute');
      await expect(page.locator('[data-menu-toggle]')).toBeHidden();
    });
  });
});

test('a faixa de informações vem antes da Têmis no HTML do hero', async ({ page }) => {
  // mata: a .hero-figure antes da .hero-facts (Hero.astro). São uns 25 KB de SVG inline, e a faixa
  // chegava numa segunda leva da rede: o hero pintava sem ela e crescia depois, e a figura, presa
  // ao pé do hero, pulava junto (CLS de 0,12 a 0,15 de 360 a 412 px, com o HTML em duas partes)
  await page.goto('/');
  const factsFirst = await page.locator('[data-hero]').evaluate((hero) => {
    const facts = hero.querySelector('.hero-facts');
    const figure = hero.querySelector('[data-figure]');
    if (!facts || !figure) throw new Error('o hero ficou sem a faixa ou sem a figura');
    return Boolean(facts.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(factsFirst).toBe(true);
});

interface PaintGlobals {
  __lcp: { time: number; hero: boolean; lazy: boolean }[];
}

/** Grava cada candidato a LCP em window.__lcp, desde antes do primeiro byte da página. */
async function recordLcp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const found: PaintGlobals['__lcp'] = [];
    Object.defineProperty(window, '__lcp', { value: found });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LargestContentfulPaint[]) {
        found.push({
          time: entry.startTime,
          // O texto de apoio ou, com movimento reduzido a 1440 px, a palavra mais longa do título.
          hero: entry.element?.matches('.hero-lead, .hero-title *') ?? false,
          lazy: entry.element?.getAttribute('loading') === 'lazy',
        });
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
}

test.describe('LCP', () => {
  // A API de LCP só existe no Chromium (e é ele que o Core Web Vitals do Google mede).
  test.skip(({ browserName }) => browserName !== 'chromium', 'LCP só no Chromium');

  for (const { viewport, reducedMotion } of [
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' },
    { viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' },
    { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  ] as const) {
    test(`o texto do hero conta desde a primeira pintura (${viewport.width} px, movimento ${reducedMotion === 'reduce' ? 'reduzido' : 'ligado'})`, async ({
      page,
    }) => {
      // mata: fade-up e fade começando em opacidade 0 (o Chromium não conta essa pintura, e o LCP
      // esperava o fim da entrada do texto de apoio, ~1,7 s depois da primeira pintura)
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion });
      await recordLcp(page);
      await page.goto('/');
      // A entrada termina (data-entered): nenhum candidato a LCP chega depois disso.
      await expect(page.locator('[data-page]')).toHaveAttribute('data-entered', '', {
        timeout: 15_000,
      });
      const { lcp, fcp } = await page.evaluate(() => ({
        lcp: (window as unknown as PaintGlobals).__lcp.at(-1),
        fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? NaN,
      }));
      expect(lcp?.hero, 'o maior elemento é texto do hero').toBe(true);
      // Folga para a CPU alta; a regressão é de ~1.700 ms.
      expect((lcp?.time ?? Infinity) - fcp).toBeLessThan(500);
    });
  }

  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 1366 },
  ]) {
    test(`no tablet em retrato, o elemento do LCP não tem loading="lazy" (${viewport.width} px)`, async ({
      page,
    }) => {
      // mata: o loading="lazy" no logo do Sobre (Sobre.astro). No tablet em retrato o hero é mais
      // baixo que a tela e o logo vira o LCP; com lazy, o pedido só saía depois do layout (~330 ms
      // a mais no perfil móvel do Lighthouse)
      await page.setViewportSize(viewport);
      await recordLcp(page);
      await page.goto('/');
      await expect(page.locator('[data-page]')).toHaveAttribute('data-entered', '', {
        timeout: 15_000,
      });
      const lcp = await page.evaluate(() => (window as unknown as PaintGlobals).__lcp.at(-1));
      expect(lcp, 'algum candidato a LCP').toBeDefined();
      expect(lcp?.lazy).toBe(false);
    });
  }
});
