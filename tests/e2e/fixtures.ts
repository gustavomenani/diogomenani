import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Locator, type Page } from '@playwright/test';

/** Link do WhatsApp do escritório, sem mensagem. */
export const WA = 'https://wa.me/5518997017246';

/** Link do WhatsApp com mensagem pronta, no formato que o site gera. */
export const wa = (text: string): string => `${WA}?text=${encodeURIComponent(text)}`;

/**
 * Inscrição na OAB e e-mail do escritório, copiados à mão como o WA: comparados com a própria
 * fonte (src/data/contact.ts), os testes passariam com qualquer valor.
 */
export const OAB = 'OAB/SP 546.508';
export const EMAIL = 'diogomenani@gmail.com';

/** Mensagens fixas do site, copiadas à mão para os testes não dependerem do código que testam. */
export const MESSAGES = {
  default: 'Olá! Gostaria de falar com um especialista.',
  topic: (subject: string) => `Olá! Gostaria de falar com um especialista sobre ${subject}.`,
  unlistedCase: 'Olá! Gostaria de saber se vocês podem me ajudar com um caso.',
} as const;

/** Espaçamento de texto do WCAG 1.4.12, como o aplicaria uma extensão do navegador. */
export const TEXT_SPACING = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;

/**
 * Rola até `top` sem a animação de `scroll-behavior: smooth`. Antes, espera um quadro: até o
 * quadro seguinte ao load, a rolagem conta como a volta da rolagem do recarregar (main.ts), e a
 * página ficaria como se tivesse aberto na posição nova, sem animar e sem recolher o header. Logo
 * depois do `goto`, que volta no load, um quadro basta: o do listener de load foi pedido antes e
 * roda primeiro.
 */
export async function jumpTo(page: Page, top: number): Promise<void> {
  await page.evaluate(async (y) => {
    await new Promise(requestAnimationFrame);
    window.scrollTo({ top: y, behavior: 'instant' });
  }, top);
}

/** Leva o elemento com o id dado para o topo da tela, sem animação, depois de um quadro (jumpTo). */
export async function jumpToSection(page: Page, id: string): Promise<void> {
  await page.evaluate(async (sectionId) => {
    await new Promise(requestAnimationFrame);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'instant' });
  }, id);
}

/** Espera `count` quadros de animação da página. */
export async function nextFrames(page: Page, count = 2): Promise<void> {
  await page.evaluate(async (frames) => {
    for (let i = 0; i < frames; i++) await new Promise(requestAnimationFrame);
  }, count);
}

/**
 * Espera o início da página terminar: o módulo marcou data-ready e o quadro seguinte tirou o
 * data-instant (motion-mode.ts). Até lá as transições estão desligadas de propósito, e quem lê o
 * estilo calculado logo depois do goto vê `transition: none`. Numa máquina rápida, o goto já volta
 * depois desse quadro; no WebKit do CI (Linux, sem GPU), o quadro chega bem depois.
 */
export async function pageReady(page: Page): Promise<void> {
  await expect(page.locator('[data-page]')).toHaveAttribute('data-ready', '');
  await expect(page.locator('[data-page][data-instant]')).toHaveCount(0);
}

/**
 * Blocos reveláveis escondidos (opacidade zero ou recortados por completo): `toBeVisible` não
 * enxerga nenhum dos dois.
 */
export async function countHiddenReveals(page: Page): Promise<number> {
  return page.locator('[data-reveal]').evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const style = getComputedStyle(element);
        return style.opacity === '0' || style.clipPath.includes('100%');
      }).length,
  );
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/**
 * Espera a interface assentar: as fontes carregadas e nenhuma animação em andamento. Durante as
 * animações de entrada, a opacidade baixa falsearia o contraste.
 */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
}

/** Violações do axe em formato legível ("regra: alvo, alvo"), com a interface já assentada. */
export async function axeViolations(page: Page): Promise<string[]> {
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

/** Confere destino e atributos de um link que abre em outra aba. */
export async function expectExternalLink(link: Locator, href: string): Promise<void> {
  await expect(link).toHaveAttribute('href', href);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
}

export { test, expect };
export type { Locator, Page };
