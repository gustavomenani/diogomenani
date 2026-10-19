import AxeBuilder from '@axe-core/playwright';
import { test, expect, jumpTo, type Locator, type Page } from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

/**
 * Violações do axe em formato legível ("regra: alvo, alvo"), com a interface já assentada:
 * durante as animações de entrada a opacidade baixa falsearia o contraste.
 */
async function axeViolations(page: Page): Promise<string[]> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== 'running'),
  );
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((node) => node.target.join(' ')).join(', ')}`,
  );
}

/**
 * Propriedade de acessibilidade que o Chromium expõe para o elemento com o papel e o nome dados
 * (via CDP): é o que o leitor de tela anuncia, inclusive estados que o axe não confere.
 */
async function accessibilityProperty(
  page: Page,
  role: string,
  name: string,
  property: 'invalid' | 'required',
): Promise<unknown> {
  const cdp = await page.context().newCDPSession(page);
  const { result } = await cdp.send('Runtime.evaluate', { expression: 'document' });
  if (!result.objectId) throw new Error('documento sem objectId');
  const { nodes } = await cdp.send('Accessibility.queryAXTree', {
    objectId: result.objectId,
    role,
    accessibleName: name,
  });
  await cdp.detach();
  const value: unknown = nodes[0]?.properties?.find((item) => item.name === property)?.value.value;
  return value;
}

test('antes do envio, os campos obrigatórios não são anunciados como inválidos', async ({
  page,
}) => {
  await page.goto('/');
  const controls = [
    ['textbox', 'Nome'],
    ['textbox', 'WhatsApp'],
    ['textbox', 'Mensagem'],
    [
      'checkbox',
      'Concordo com o uso dos meus dados apenas para o retorno deste contato, conforme a LGPD.',
    ],
  ] as const;
  for (const [role, name] of controls) {
    expect(await accessibilityProperty(page, role, name, 'invalid'), name).toBe('false');
  }
  for (const name of ['Nome', 'WhatsApp', 'Mensagem']) {
    expect(await accessibilityProperty(page, 'textbox', name, 'required'), name).toBe(true);
  }
});

test.describe('axe', () => {
  test.use({ reducedMotion: 'reduce' });

  test('axe sem violações no celular e no desktop', async ({ page }) => {
    for (const viewport of [MOBILE, DESKTOP]) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      expect(await axeViolations(page), `${viewport.width}px`).toEqual([]);
    }
  });

  test('axe sem violações com o menu aberto e com erros no formulário', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'true');
    expect(await axeViolations(page), 'menu aberto').toEqual([]);

    await page.setViewportSize(DESKTOP);
    await page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }).click();
    await expect(page.getByText('Revise os campos destacados para continuar.')).toBeVisible();
    expect(await axeViolations(page), 'erros no formulário').toEqual([]);
  });
});

test('o link da marca se chama pelo texto visível', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const brand = page.locator('[data-header]').getByRole('link', {
    name: 'Diogo Menani Advocacia & Assessoria Jurídica',
    exact: true,
  });
  await expect(brand).toBeVisible();
  await expect(brand).not.toHaveAttribute('aria-label');
});

test.describe('menu mobile', () => {
  test.use({ viewport: MOBILE });

  test('o menu é um landmark e isola o resto da página', async ({ page }) => {
    await page.goto('/');
    const main = page.locator('main');
    const footer = page.locator('footer');
    await expect(page.locator('[data-menu]')).toHaveAttribute('inert');
    await expect(main).not.toHaveAttribute('inert');

    await page.locator('[data-menu-toggle]').click();
    const menu = page.getByRole('navigation', { name: 'Menu', exact: true });
    await expect(menu.getByRole('link', { name: 'Agendar uma conversa' })).toBeVisible();
    await expect(page.locator('[data-menu]')).not.toHaveAttribute('inert');
    await expect(main).toHaveAttribute('inert');
    await expect(footer).toHaveAttribute('inert');

    await page.keyboard.press('Escape');
    await expect(main).not.toHaveAttribute('inert');
    await expect(footer).not.toHaveAttribute('inert');
  });

  test('o botão do menu se chama pelo texto visível', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('[data-menu-toggle]');
    await expect(toggle).not.toHaveAttribute('aria-label');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('button', { name: 'Fechar', exact: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

test('o header reaparece quando o foco entra nele e não recolhe com o foco dentro', async ({
  page,
}) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const header = page.locator('[data-header]');
  await jumpTo(page, 2000);
  await expect(header).toHaveClass(/is-tucked/);

  await header.getByRole('link', { name: /^Diogo Menani/ }).focus();
  await expect(header).not.toHaveClass(/is-tucked/);

  await jumpTo(page, 2600);
  await expect(header).toHaveClass(/is-scrolled/);
  await expect(header).not.toHaveClass(/is-tucked/);
});

test('o primeiro Tab mostra o link para pular ao conteúdo', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Família', { exact: true })).toBeFocused();
});

test('o skip link escondido não projeta sombra sobre a página', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true });
  await expect(skip).toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Tab');
  await expect(skip).toBeFocused();
  await expect(skip).not.toHaveCSS('box-shadow', 'none');
});

test('no alto contraste, o campo focado ganha contorno', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  const name = page.getByLabel('Nome', { exact: true });
  await name.focus();
  await expect(name).toHaveCSS('outline-style', 'solid');
});

test('o texto selecionado aparece em qualquer fundo', async ({ page }) => {
  await page.goto('/');
  const selection = (locator: Locator) =>
    locator.evaluate((element) => {
      const style = getComputedStyle(element, '::selection');
      return `${style.backgroundColor} / ${style.color}`;
    });
  const royal = 'rgb(0, 22, 123) / rgb(255, 255, 255)';
  const white = 'rgb(255, 255, 255) / rgb(0, 22, 123)';

  // Fundo claro, inclusive o cartão branco do formulário na seção royal: seleção royal.
  expect(await selection(page.getByLabel('Nome', { exact: true }))).toBe(royal);
  expect(
    await selection(page.getByText('Preencha os campos e a mensagem chega pronta no WhatsApp.')),
  ).toBe(royal);
  // Fundo royal (rodapé, menu e header sobre o hero): seleção branca.
  expect(
    await selection(page.getByRole('contentinfo').getByText(/^Conteúdo de caráter informativo/)),
  ).toBe(white);
  expect(
    await selection(
      page.locator('[data-menu]').getByRole('link', { name: 'Sobre', includeHidden: true }),
    ),
  ).toBe(white);
  expect(
    await selection(page.getByRole('banner').getByRole('link', { name: /^Diogo Menani/ })),
  ).toBe(white);
});

test('o título principal tem nome acessível sem aria-label', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('heading', {
    level: 1,
    name: 'Clareza para entender. Firmeza para defender.',
    exact: true,
  });
  await expect(title).toBeVisible();
  await expect(title).not.toHaveAttribute('aria-label');
});

test.describe('FAQ sem JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('FAQ sem JavaScript declara tudo aberto', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('#duvidas button');
    await expect(buttons).toHaveCount(5);
    for (const button of await buttons.all()) {
      await expect(button).toHaveAttribute('aria-expanded', 'true');
    }
  });
});

test('com JavaScript, o FAQ declara só a primeira aberta', async ({ page }) => {
  await page.goto('/');
  const states = await page
    .locator('#duvidas button')
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute('aria-expanded')));
  expect(states).toEqual(['true', 'false', 'false', 'false', 'false']);
});

test('a navegação do rodapé é um landmark', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Navegação', exact: true });
  await expect(nav.getByRole('link', { name: 'Dúvidas frequentes' })).toBeAttached();
});
