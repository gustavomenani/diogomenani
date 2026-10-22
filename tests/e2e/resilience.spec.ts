import { test, expect, countHiddenReveals, jumpTo, SUBMIT } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 } });

test('sem o módulo da página, todo o conteúdo aparece', async ({ page }) => {
  // O módulo não chega (rede, bloqueio): a página volta ao modo sem script.
  await page.route('**/_astro/*.js', (route) => route.abort());
  await page.goto('/');
  const root = page.locator('[data-page]');
  await expect(root).toHaveAttribute('data-motion', 'pending');
  expect(await countHiddenReveals(page)).toBe(0);
  // mata: o data-fallback do script inline (o formulário ficava visível sem script, e o header,
  // fixo e transparente, sumia sobre as seções brancas)
  await expect(root).toHaveAttribute('data-fallback', '');
  await expect(page.locator('[data-contact-form]')).toBeHidden();
  await expect(page.locator('[data-header]')).toHaveCSS('position', 'absolute');
});

test.describe('sem o módulo da página, no celular', () => {
  test.use({ viewport: { width: 390, height: 664 } });

  test('o botão Menu some, e os botões do WhatsApp continuam', async ({ page }) => {
    // O Menu depende do módulo: sem ele, o toque não abriria nada.
    await page.route('**/_astro/*.js', (route) => route.abort());
    await page.goto('/');
    await expect(page.locator('[data-page]')).toHaveAttribute('data-fallback', '');
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeHidden();
    await expect(page.locator('[data-wa-cta]')).toBeVisible();
  });
});

test('com o módulo da página, a raiz não ganha data-fallback', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('load');
  const root = page.locator('[data-page]');
  await expect(root).toHaveAttribute('data-ready', '');
  await expect(root).not.toHaveAttribute('data-fallback');
  await expect(page.locator('[data-header]')).toHaveCSS('position', 'fixed');
});

test('antes de o módulo chegar, enviar o formulário não manda nada ao servidor', async ({
  page,
}) => {
  // mata: method="post" no formulário (sem o script, o envio nativo mandava nome, telefone e
  // relato ao servidor por POST e recarregava a página, apagando o que foi digitado)
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/_astro/*.js', async (route) => {
    await held;
    await route.abort();
  });
  // O módulo segura o DOMContentLoaded e o load: a página fica no ponto em que só o HTML chegou.
  await page.goto('/', { waitUntil: 'commit' });
  const name = page.getByLabel('Nome', { exact: true });
  await expect(name).toBeAttached();
  let navigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations += 1;
  });
  await name.fill('Ana Souza');
  await page.getByLabel('WhatsApp', { exact: true }).fill('(18) 99123-4567');
  await page.getByLabel('Mensagem', { exact: true }).fill('Recebo BPC e o benefício foi cortado.');
  await page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }).check();
  // Um envio nativo sairia logo depois do clique: espera um POST por até 1 s.
  const posted = page
    .waitForRequest((request) => request.method() === 'POST', { timeout: 1000 })
    .then(
      (request) => request.url(),
      () => null,
    );
  await page.getByRole('button', { name: SUBMIT, exact: true }).click();
  expect(await posted).toBeNull();
  expect(navigations).toBe(0);
  await expect(name).toHaveValue('Ana Souza');
  release();
});

test('uma revelação que falha não derruba o resto da página', async ({ page, openedUrls }) => {
  // Um navegador sem IntersectionObserver, ou um erro no código da revelação.
  await page.addInitScript(() => {
    window.IntersectionObserver = function () {
      throw new Error('IntersectionObserver indisponível');
    } as unknown as typeof IntersectionObserver;
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  expect(await countHiddenReveals(page)).toBe(0);
  const answer = page.getByText('Sim. Reuniões podem ser feitas por videochamada');
  await expect(answer).toBeVisible();
  await expect(answer).toHaveCSS('opacity', '1');
  await jumpTo(page, 100);
  await expect(page.locator('[data-header]')).toHaveClass(/is-scrolled/);

  await page.getByLabel('Nome', { exact: true }).fill('Ana Souza');
  await page.getByLabel('WhatsApp', { exact: true }).fill('18997017249');
  await page.getByLabel('Mensagem', { exact: true }).fill('Fui demitida sem receber as verbas.');
  await page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }).check();
  await page.getByRole('button', { name: SUBMIT, exact: true }).click();
  await expect.poll(openedUrls).toEqual([expect.stringMatching(/^https:\/\/wa\.me\//)]);

  expect(errors).toEqual([expect.stringContaining('revelação')]);
});

test('com o formulário incompleto, enviar não recarrega a página e mostra o link de reserva', async ({
  page,
}) => {
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<input[^>]*name="nome"[^>]*>/, '');
    await route.fulfill({ response, body: html });
  });
  await page.goto('/');
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.getByRole('button', { name: SUBMIT, exact: true }).click();
  await expect(
    page.getByRole('link', {
      name: 'Se o WhatsApp não abriu, use este link para enviar a mensagem.',
    }),
  ).toBeVisible();
  expect(navigations).toEqual([]);
});

test('um formulário incompleto não derruba o resto da página', async ({ page }) => {
  // Serve a página sem o campo "Nome": o formulário fica sem script, o resto segue funcionando.
  await page.route('**/', async (route) => {
    const response = await route.fetch();
    const html = (await response.text()).replace(/<input[^>]*name="nome"[^>]*>/, '');
    await route.fulfill({ response, body: html });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');
  await expect(page.locator('input[name="nome"]')).toHaveCount(0);
  await jumpTo(page, 100);
  await expect(page.locator('[data-header]')).toHaveClass(/is-scrolled/);
  expect(errors).toEqual([]);
});
