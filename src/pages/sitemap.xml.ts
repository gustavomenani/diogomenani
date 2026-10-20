import type { APIRoute } from 'astro';
import { site as siteData } from '../data/site';

/**
 * `/sitemap.xml` com as páginas de `site.pages`. O sitemap só aceita endereço absoluto: sem o
 * `site` do astro.config.mjs, sai o `<urlset>` vazio (válido, mas sem nenhuma página).
 */
export const GET: APIRoute = ({ site }) => {
  const urls = site
    ? siteData.pages.map((path) => `  <url><loc>${new URL(path, site).href}</loc></url>\n`)
    : [];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('')}</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
