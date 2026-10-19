import { test as base, expect, type Locator, type Page } from '@playwright/test';

/** Link do WhatsApp do escritório, sem mensagem. */
export const WA = 'https://wa.me/5518997017249';

/** Link do WhatsApp com mensagem pronta, no formato que o site gera. */
export const wa = (text: string): string => `${WA}?text=${encodeURIComponent(text)}`;

/** Mensagens fixas do site, copiadas à mão para os testes não dependerem do código que testam. */
export const MESSAGES = {
  default: 'Olá, Dr. Diogo! Gostaria de agendar uma conversa.',
  topic: (area: string) => `Olá, Dr. Diogo! Gostaria de agendar uma conversa sobre ${area}.`,
  area: (area: string) => `Olá, Dr. Diogo! Gostaria de conversar sobre ${area}.`,
  unlistedCase: 'Olá, Dr. Diogo! Gostaria de saber se você pode me ajudar com um caso.',
} as const;

/** Rola até `top` sem a animação de `scroll-behavior: smooth`. */
export async function jumpTo(page: Page, top: number): Promise<void> {
  await page.evaluate((y) => {
    window.scrollTo({ top: y, behavior: 'instant' });
  }, top);
}

/** Leva o elemento com o id dado para o topo da tela, sem animação. */
export async function jumpToSection(page: Page, id: string): Promise<void> {
  await page.evaluate((sectionId) => {
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

/** Confere destino e atributos de um link que abre em outra aba. */
export async function expectExternalLink(link: Locator, href: string): Promise<void> {
  await expect(link).toHaveAttribute('href', href);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener');
}

interface Fixtures {
  /** URLs passadas a `window.open`, que é trocado por um registro: nenhuma janela abre. */
  openedUrls: () => Promise<string[]>;
}

/** Troca `window.open` por um registro das URLs pedidas. */
function stubWindowOpen(): void {
  const opened: string[] = [];
  Object.defineProperty(window, '__openedUrls', { value: opened });
  window.open = (url?: string | URL) => {
    opened.push(String(url));
    return null;
  };
}

export const test = base.extend<Fixtures>({
  openedUrls: async ({ page }, use) => {
    // Vale para as próximas navegações e também para a página já aberta: fixtures pedidas só
    // pelo corpo do teste são montadas depois do beforeEach, que pode já ter navegado.
    await page.addInitScript(stubWindowOpen);
    await page.evaluate(stubWindowOpen);
    await use(() =>
      page.evaluate(() => (window as unknown as { __openedUrls: string[] }).__openedUrls),
    );
  },
});

export { expect };
export type { Locator, Page };
