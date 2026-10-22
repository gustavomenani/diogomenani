import type { APIRoute, GetStaticPaths } from 'astro';
import { logoLayouts, logoTones, type LogoTone, type LogoVariant } from '../data/brand';
import { logoPath, logoSvg } from '../lib/logo';

/**
 * O logo como arquivo: fica fora do HTML e vai para o cache do navegador. A versão azul vai sobre
 * fundo claro; a branca, sobre o azul. A oficial sai em `/logo-blue.svg` e `/logo-white.svg`; a
 * compacta do header, em `/logo-compact-blue.svg` e `/logo-compact-white.svg`.
 */
interface Props {
  tone: LogoTone;
  variant: LogoVariant;
}

export const getStaticPaths = (() =>
  (Object.keys(logoLayouts) as LogoVariant[]).flatMap((variant) =>
    (Object.keys(logoTones) as LogoTone[]).map((tone) => ({
      // O caminho sem a barra, o "logo-" e o ".svg" da rota: "blue", "compact-white"…
      params: { file: logoPath(tone, variant).slice('/logo-'.length, -'.svg'.length) },
      props: { tone, variant },
    })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute<Props> = ({ props: { tone, variant } }) =>
  new Response(logoSvg(tone, variant), { headers: { 'Content-Type': 'image/svg+xml' } });
