import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo-files';

/** `/robots.txt`, que libera o site inteiro; o texto sai de `lib/seo-files.ts`. */
export const GET: APIRoute = ({ site }) =>
  new Response(robotsTxt(site), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
