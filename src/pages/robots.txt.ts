import type { APIRoute } from 'astro';

/**
 * `/robots.txt`: libera o site inteiro. O endereço do sitemap precisa ser absoluto, então a linha
 * `Sitemap:` só sai com o `site` do astro.config.mjs.
 */
export const GET: APIRoute = ({ site }) => {
  const lines = ['User-agent: *', 'Allow: /'];
  if (site) lines.push('', `Sitemap: ${new URL('/sitemap.xml', site).href}`);
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
