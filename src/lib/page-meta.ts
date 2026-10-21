// Endereços absolutos do <head>: canonical, og:url e a imagem de prévia dos links.
import { site } from '../data/site';

export interface PageUrls {
  /** Canonical e og:url. */
  canonical: string | undefined;
  /** og:image e twitter:image. */
  ogImage: string | undefined;
}

/**
 * Canonical, og:url e a imagem de prévia exigem endereço absoluto: sem o `site` do
 * astro.config.mjs, essas tags não saem (quem lê o Open Graph não resolve caminho relativo). A
 * página com noindex (a 404) também fica sem canonical e og:url: não há endereço a indicar.
 */
export function pageUrls(path: string, siteUrl: URL | undefined, noindex: boolean): PageUrls {
  return {
    canonical: !noindex && siteUrl ? new URL(path, siteUrl).href : undefined,
    ogImage: siteUrl && new URL(site.ogImage, siteUrl).href,
  };
}
