import type { APIRoute } from 'astro';
import { site as siteData } from '../data/site';
import { sitemapXml } from '../lib/seo-files';

/** `/sitemap.xml` com as páginas de `site.pages`; o texto sai de `lib/seo-files.ts`. */
export const GET: APIRoute = ({ site }) =>
  new Response(sitemapXml(siteData.pages, site), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
