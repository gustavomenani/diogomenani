// O texto do /sitemap.xml e do /robots.txt. Fica fora das rotas para os testes rodarem com um
// domínio: sem o `site` no astro.config.mjs, o build só gera a versão sem endereço.

/**
 * O sitemap com as páginas dadas. Ele só aceita endereço absoluto: sem o `site` do
 * astro.config.mjs, sai o `<urlset>` vazio (válido, mas sem nenhuma página).
 */
export function sitemapXml(pages: readonly string[], siteUrl: URL | undefined): string {
  const urls = siteUrl
    ? pages.map((path) => `  <url><loc>${new URL(path, siteUrl).href}</loc></url>\n`)
    : [];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}</urlset>
`;
}

/**
 * O robots.txt: libera o site inteiro. O endereço do sitemap precisa ser absoluto, então a linha
 * `Sitemap:` só sai com o `site` do astro.config.mjs.
 */
export function robotsTxt(siteUrl: URL | undefined): string {
  const lines = ['User-agent: *', 'Allow: /'];
  if (siteUrl) lines.push('', `Sitemap: ${new URL('/sitemap.xml', siteUrl).href}`);
  return `${lines.join('\n')}\n`;
}
