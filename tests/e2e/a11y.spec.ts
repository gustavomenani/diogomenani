import AxeBuilder from '@axe-core/playwright';
import { areas } from '../../src/data/content';
import {
  test,
  expect,
  axeViolations,
  jumpTo,
  settle,
  SUBMIT,
  type Locator,
  type Page,
} from './fixtures';

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

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
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'lê a árvore de acessibilidade pelo CDP do Chromium');
  await page.goto('/');
  const controls = [
    ['textbox', 'Nome'],
    ['textbox', 'WhatsApp'],
    ['textbox', 'Mensagem'],
    [
      'checkbox',
      'Concordo com o uso dos meus dados apenas para o retorno deste contato, conforme a LGPD e o aviso de privacidade (abre em outra aba).',
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

  for (const viewport of [MOBILE, DESKTOP]) {
    test(`axe sem violações em ${viewport.width} px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      expect(await axeViolations(page)).toEqual([]);
    });
  }

  test('axe sem violações com o menu aberto e com erros no formulário', async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto('/');
    await page.locator('[data-menu-toggle]').click();
    await expect(page.locator('[data-menu-toggle]')).toHaveAttribute('aria-expanded', 'true');
    expect(await axeViolations(page), 'menu aberto').toEqual([]);

    await page.setViewportSize(DESKTOP);
    await page.getByRole('button', { name: SUBMIT, exact: true }).click();
    await expect(page.getByText('Revise os campos destacados para continuar.')).toBeVisible();
    expect(await axeViolations(page), 'erros no formulário').toEqual([]);
  });

  /*
   * O degradê para o prata no pé do hero (.hero::after) e o fundo em degradê deixam todo o texto
   * do hero sem medida no axe (incomplete), e "sem violações" passaria sem conferir o contraste
   * dele. Esta passada põe atrás do texto o tom mais claro que fica ali: o branco a 17% sobre o
   * royal, que é a Têmis no celular (atrás do texto, com opacidade 0,17) e equivale ao centro do
   * brilho (o royal sozinho, a parada mais clara do degradê, não é o pior caso). O brilho e a
   * figura saem, porque com eles o axe não mede (bgGradient e imgNode), e nenhum texto fica sobre
   * o prata do pé. Fica sem medida só o rótulo do botão principal: royal sobre a pílula clara, não
   * sobre o hero, com o ::before do hover por cima (pseudoContent). Com um mínimo de textos
   * medidos e nada mais sem medida, se o axe voltar a não medir, o teste reprova em vez de passar
   * em silêncio.
   */
  for (const viewport of [MOBILE, DESKTOP]) {
    test(`contraste do texto do hero medido sobre o tom mais claro atrás dele em ${viewport.width} px`, async ({
      page,
    }) => {
      // mata: um texto do hero apagado demais para o fundo mais claro atrás dele (no celular, a
      // Têmis), que o axe deixava sem medida
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.addStyleTag({
        content:
          '.hero::after { content: none !important; } .hero-glow { display: none !important; } [data-figure] { visibility: hidden !important; } .hero-bg { background: color-mix(in srgb, #fff 17%, var(--royal)) !important; }',
      });
      await settle(page);
      const results = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .include('#inicio')
        .analyze();
      expect(
        results.violations.flatMap((rule) => rule.nodes.map((node) => node.target.join(' '))),
      ).toEqual([]);
      expect(
        results.incomplete
          .flatMap((rule) => rule.nodes.map((node) => node.target.join(' ')))
          .filter((target) => !target.includes('.btn-label')),
        'textos sem medida',
      ).toEqual([]);
      expect(results.passes.flatMap((rule) => rule.nodes).length).toBeGreaterThanOrEqual(16);
    });
  }
});

test('as áreas de atuação são títulos de nível 3, como as etapas e as dúvidas', async ({
  page,
}) => {
  // mata: o nome da área num <span> (fora da estrutura de títulos que o leitor de tela percorre)
  await page.goto('/');
  await expect(page.locator('#atuacao').getByRole('heading', { level: 3 })).toHaveText(
    areas.map(({ name }) => name),
  );
});

test('o link da marca se chama pelo texto alternativo do logo', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const brand = page.locator('[data-header]').getByRole('link', {
    name: 'Diogo Menani — Advocacia e Assessoria Jurídica',
    exact: true,
  });
  await expect(brand).toBeVisible();
  await expect(brand).not.toHaveAttribute('aria-label');
  // As duas versões do logo: só a branca tem texto; a azul, por cima dela, é decorativa.
  await expect(brand.locator('img')).toHaveCount(2);
  await expect(brand.locator('img[alt=""]')).toHaveCount(1);
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
    await expect(menu.getByRole('link', { name: 'Fale com um especialista' })).toBeVisible();
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

test('o primeiro Tab mostra o link para pular ao conteúdo', async ({ page, browserName }) => {
  test.skip(browserName === 'webkit', 'no Safari o Tab não passa por links (padrão da plataforma)');
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();

  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Família internacional', { exact: true })).toBeFocused();
});

test('o skip link escondido não projeta sombra sobre a página', async ({ page }) => {
  await page.setViewportSize(DESKTOP);
  await page.goto('/');
  const skip = page.getByRole('link', { name: 'Pular para o conteúdo', exact: true });
  await expect(skip).toHaveCSS('box-shadow', 'none');
  await skip.focus();
  await expect(skip).toBeFocused();
  await expect(skip).not.toHaveCSS('box-shadow', 'none');
});

test('no alto contraste, só o campo focado tem contorno', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/');
  const name = page.getByLabel('Nome', { exact: true });
  // mata: o contorno transparente em todos os campos, que o alto contraste pinta com a cor do
  // sistema
  await expect(name).toHaveCSS('outline-style', 'none');
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
  // Fundo royal (seções royal, rodapé, menu e header sobre o hero): seleção branca.
  expect(
    await selection(page.getByText(/^Assessoria jurídica completa para Vistos Americanos/)),
  ).toBe(white);
  expect(
    await selection(page.getByRole('contentinfo').getByText(/^Conteúdo de caráter informativo/)),
  ).toBe(white);
  expect(
    await selection(
      page.locator('[data-menu]').getByRole('link', { name: 'Sobre', includeHidden: true }),
    ),
  ).toBe(white);
  // A marca do header é só imagem, sem texto a selecionar: vale a navegação sobre o hero.
  expect(
    await selection(
      page.locator('[data-nav]').getByRole('link', { name: 'Sobre', includeHidden: true }),
    ),
  ).toBe(white);
});

test('o título principal tem nome acessível sem aria-label', async ({ page }) => {
  await page.goto('/');
  const title = page.getByRole('heading', {
    level: 1,
    name: 'Diogo Menani · Advogado Clareza para entender. Firmeza para defender.',
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

for (const path of ['/', '/privacidade/', '/nao-existe']) {
  test(`em ${path}, todo link que abre em outra aba avisa o leitor de tela`, async ({ page }) => {
    await page.goto(path);
    const NOTE = /\(abre em outra aba\)$/;
    // Todos, inclusive os escondidos agora (menu fechado, link de reserva do formulário): o
    // aria-label ou o texto, que inclui o sr-only.
    const names = await page
      .locator('a[target="_blank"]')
      .evaluateAll((anchors) =>
        anchors.map((anchor) => (anchor.getAttribute('aria-label') ?? anchor.textContent).trim()),
      );
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name.endsWith('(abre em outra aba)'))).toEqual([]);
    // Os visíveis: o nome acessível que o navegador calcula.
    for (const link of await page.locator('a[target="_blank"]:visible').all()) {
      await expect(link).toHaveAccessibleName(NOTE);
    }
  });
}

test('o botão de envio do formulário, que abre o WhatsApp em outra aba, também avisa', async ({
  page,
}) => {
  // mata: o aviso sr-only no botão de envio (ContactForm.astro): o window.open trocava de aba sem
  // aviso, ao contrário de todos os links que abrem outra aba, que o teste acima confere
  await page.goto('/');
  await expect(page.locator('[data-contact-form] [type="submit"]')).toHaveAccessibleName(SUBMIT);
});
