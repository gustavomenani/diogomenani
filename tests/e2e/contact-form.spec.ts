import { test, expect, wa, SUBMIT, type Locator, type Page } from './fixtures';

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

const ERRORS = {
  name: 'Informe seu nome.',
  phone: 'Informe um número com DDD.',
  email: 'Confira o e-mail digitado.',
  message: 'Escreva uma mensagem curta sobre o seu caso.',
  consent: 'Para continuar, confirme o uso dos dados.',
} as const;

function form(page: Page) {
  return {
    name: page.getByLabel('Nome', { exact: true }),
    phone: page.getByLabel('WhatsApp', { exact: true }),
    email: page.getByLabel('E-mail (opcional)', { exact: true }),
    subject: page.getByLabel('Assunto (opcional)', { exact: true }),
    message: page.getByLabel('Mensagem', { exact: true }),
    consent: page.getByRole('checkbox', { name: /Concordo com o uso dos meus dados/ }),
    submit: page.getByRole('button', { name: SUBMIT, exact: true }),
    error: (text: string) => page.getByText(text, { exact: true }),
  };
}

async function fillValid(page: Page): Promise<void> {
  const f = form(page);
  await f.name.fill('Ana Souza');
  await f.phone.fill('18997017249');
  await f.message.fill('Fui demitida sem receber as verbas.');
  await f.consent.check();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('enviar vazio mostra os erros e foca o primeiro campo', async ({ page }) => {
  const f = form(page);
  await f.submit.click();

  await expect(page.getByText('Revise os campos destacados para continuar.')).toBeVisible();
  await expect(f.name).toBeFocused();
  for (const text of [ERRORS.name, ERRORS.phone, ERRORS.message, ERRORS.consent]) {
    await expect(f.error(text)).toBeVisible();
  }
  await expect(f.error(ERRORS.email)).toBeHidden();
  for (const control of [f.name, f.phone, f.message, f.consent]) {
    await expect(control).toHaveAttribute('aria-invalid', 'true');
  }
  await expect(f.email).toHaveAttribute('aria-invalid', 'false');
});

test('corrigir um campo limpa só o erro dele', async ({ page }) => {
  const f = form(page);
  await f.submit.click();
  await f.name.fill('Ana');
  await expect(f.error(ERRORS.name)).toBeHidden();
  await expect(f.name).toHaveAttribute('aria-invalid', 'false');
  await expect(f.error(ERRORS.phone)).toBeVisible();
});

test('e-mail inválido é recusado', async ({ page, openedUrls }) => {
  const f = form(page);
  await fillValid(page);
  await f.email.fill('ana@x');
  await f.submit.click();
  await expect(f.error(ERRORS.email)).toBeVisible();
  expect(await openedUrls()).toEqual([]);
});

test('a máscara formata o telefone', async ({ page }) => {
  const { phone } = form(page);
  await phone.pressSequentially('18997017249');
  await expect(phone).toHaveValue('(18) 99701-7249');
  await phone.fill('+55 18 99701-7249');
  await expect(phone).toHaveValue('(18) 99701-7249');
  await phone.fill('1834567890');
  await expect(phone).toHaveValue('(18) 3456-7890');
});

test('digitando, o dígito a mais com DDD 55 é cortado, sem trocar o número', async ({ page }) => {
  const { phone } = form(page);
  await phone.pressSequentially('559912345678');
  await expect(phone).toHaveValue('(55) 99123-4567');
});

test('número de fora com o prefixo 00 fica com o + no lugar dele, digitado ou colado', async ({
  page,
}) => {
  // mata: o 00 lido como zeros à esquerda do DDD (o número de fora virava um brasileiro falso)
  const { phone } = form(page);
  await phone.pressSequentially('00351912345678');
  await expect(phone).toHaveValue('+351912345678');
  await phone.fill('001 305 555 0123');
  await expect(phone).toHaveValue('+1 305 555 0123');
});

test('envio válido abre o WhatsApp com a mensagem montada', async ({ page, openedUrls }) => {
  const f = form(page);
  await fillValid(page);
  await f.email.fill('ana@email.com');
  await f.subject.selectOption('Previdenciário');
  await f.submit.click();

  const expected = wa(
    'Olá! Meu nome é Ana Souza. Assunto: Previdenciário. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249, e-mail: ana@email.com)',
  );
  expect(await openedUrls()).toEqual([expected]);
  const status = page.getByText('Mensagem pronta. Confirme o envio no WhatsApp.');
  await expect(status).toBeVisible();
  const fallback = page.getByRole('link', {
    name: 'Se o WhatsApp não abriu, use este link para enviar a mensagem.',
  });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('href', expected);
  // O envio de verdade é no WhatsApp: depois do intervalo, o aviso continua dizendo esse passo,
  // sem um "abrindo…" que não termina.
  await expect(f.submit).not.toHaveAttribute('aria-disabled', 'true');
  await expect(status).toBeVisible();
  await expect(page.getByText(/Abrindo/)).toHaveCount(0);
});

test('editar um campo depois de enviar esconde o link de reserva e limpa o aviso', async ({
  page,
  openedUrls,
}) => {
  const f = form(page);
  await fillValid(page);
  await f.submit.click();
  await expect.poll(openedUrls).toHaveLength(1);
  const fallback = page.getByRole('link', {
    name: 'Se o WhatsApp não abriu, use este link para enviar a mensagem.',
  });
  await expect(fallback).toBeVisible();
  // O link levaria a mensagem antiga.
  await f.message.fill('Outra mensagem.');
  await expect(fallback).toBeHidden();
  await expect(page.getByText('Mensagem pronta. Confirme o envio no WhatsApp.')).toBeHidden();
});

test('passar o mouse no link de reserva escurece a cor e acende o sublinhado, como nos outros links', async ({
  page,
  openedUrls,
}) => {
  // mata: o .link no link de reserva (ContactForm.astro): repetia o visual à mão e era o único link
  // de texto sem retorno ao ponteiro, justo no estado em que pode ser preciso clicar nele
  await fillValid(page);
  await form(page).submit.click();
  await expect.poll(openedUrls).toHaveLength(1);
  const fallback = page.getByRole('link', {
    name: 'Se o WhatsApp não abriu, use este link para enviar a mensagem.',
  });
  await fallback.hover();
  const colors = await fallback.evaluate(async (link) => {
    await Promise.all(link.getAnimations().map((animation) => animation.finished));
    const style = getComputedStyle(link);
    return [style.color, style.textDecorationColor];
  });
  expect(colors).toEqual(['rgb(0, 22, 123)', 'rgb(0, 22, 123)']);
});

for (const width of [390, 768, 1440]) {
  test(`a ${width} px, com o status vazio, o pé do cartão tem só o respiro do cartão`, async ({
    page,
  }) => {
    // mata: a reserva do status vazio (ContactForm.astro), que somava o gap da grade e deixava
    // ~40 px a mais sob o botão de envio, quase o dobro do respiro do topo
    await page.setViewportSize({ width, height: 900 });
    const status = page.locator('[data-form-status]');
    await expect(status).toHaveText('');
    const gap = () =>
      page.locator('[data-contact-form]').evaluate((card) => {
        const submit = card.querySelector('[type="submit"]');
        if (!submit) throw new Error('formulário sem o botão de envio');
        const below = card.getBoundingClientRect().bottom - submit.getBoundingClientRect().bottom;
        return below - parseFloat(getComputedStyle(card).paddingBottom);
      });
    expect(await gap()).toBeCloseTo(0, 0);
    // Com o aviso, o status volta ao fluxo, embaixo do botão e dentro do cartão.
    await form(page).submit.click();
    await expect(status).toHaveText('Revise os campos destacados para continuar.');
    expect(await gap()).toBeGreaterThan(30);
  });
}

test('o foco fica no botão durante o intervalo entre envios', async ({ page, openedUrls }) => {
  const f = form(page);
  await fillValid(page);
  await f.submit.focus();
  await page.keyboard.press('Enter');
  await expect.poll(openedUrls).toHaveLength(1);
  await expect(f.submit).toBeFocused();
  await expect(f.submit).toHaveAttribute('aria-disabled', 'true');
  // Um segundo envio no intervalo não abre outra conversa.
  await page.keyboard.press('Enter');
  expect(await openedUrls()).toHaveLength(1);
  await expect(f.submit).not.toHaveAttribute('aria-disabled', 'true');
});

test('dois Enter seguidos abrem uma única conversa', async ({ page, context }) => {
  // mata: if (coolingDown) return; removido do envio em contact-form
  // A conversa abre de verdade, numa aba nova: o wa.me responde daqui, sem sair para a rede.
  await context.route('https://wa.me/**', (route) => route.fulfill({ body: '' }));
  // Relógio parado: o intervalo entre envios não acaba sozinho, por mais que a aba demore.
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.goto('/');
  let popups = 0;
  page.on('popup', () => {
    popups++;
  });
  const f = form(page);
  await fillValid(page);
  await f.submit.focus();
  const first = page.waitForEvent('popup');
  await page.keyboard.press('Enter');
  await first;
  // No Firefox a aba nova fica com o teclado: o segundo Enter é de quem voltou ao site.
  await page.bringToFront();
  await expect(f.submit).toHaveAttribute('aria-disabled', 'true');
  await page.keyboard.press('Enter');
  // Dá 1,5 s para uma segunda aba aparecer; o relógio parado mantém o intervalo até lá.
  await page.waitForEvent('popup', { timeout: 1500 }).catch(() => null);
  expect(popups).toBe(1);
});

test('a máscara espera o fim da composição do teclado (IME)', async ({ page }) => {
  const { phone } = form(page);
  await phone.focus();
  // Durante a composição, o texto é do teclado: reformatar no meio embaralharia o número.
  const duringComposition = await phone.evaluate((input: HTMLInputElement) => {
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.value = '１８９';
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        isComposing: true,
        inputType: 'insertCompositionText',
      }),
    );
    return input.value;
  });
  expect(duringComposition).toBe('１８９');
  await phone.evaluate((input: HTMLInputElement) => {
    input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
  });
  await expect(phone).toHaveValue('(18) 9');
});

test('o campo focado tem contorno de 2 px, vermelho quando tem erro', async ({ page }) => {
  const f = form(page);
  await f.name.focus();
  await expect(f.name).toHaveCSS('outline-style', 'solid');
  await expect(f.name).toHaveCSS('outline-width', '2px');
  await expect(f.name).toHaveCSS('outline-color', 'rgb(36, 64, 230)');
  await f.submit.click();
  await expect(f.name).toBeFocused();
  await expect(f.name).toHaveCSS('outline-color', 'rgb(180, 35, 24)');
});

test.describe('no celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('ao enviar com erros, o primeiro campo inválido fica no meio da tela', async ({ page }) => {
    const f = form(page);
    // O botão no pé da tela deixa o Nome, primeiro inválido, acima dela.
    await f.submit.scrollIntoViewIfNeeded();
    await f.submit.click();
    await expect(f.name).toBeFocused();
    await expect
      .poll(async () => {
        const box = await f.name.boundingBox();
        return box ? Math.abs(box.y + box.height / 2 - 844 / 2) : Infinity;
      })
      .toBeLessThan(24);
  });
});

test('sem assunto e sem e-mail a mensagem omite essas partes', async ({ page, openedUrls }) => {
  await fillValid(page);
  await form(page).submit.click();
  expect(await openedUrls()).toEqual([
    wa(
      'Olá! Meu nome é Ana Souza. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249)',
    ),
  ]);
});

test('editar o telefone no meio mantém o cursor no lugar', async ({ page }) => {
  const { phone } = form(page);
  await phone.fill('18997017249');
  await expect(phone).toHaveValue('(18) 99701-7249');
  const caret = () => phone.evaluate((input: HTMLInputElement) => input.selectionStart);

  // Digita um 5 logo depois de "(18) 99": o resto anda e o cursor fica depois do 5.
  await phone.evaluate((input: HTMLInputElement) => {
    input.setSelectionRange(7, 7);
  });
  await page.keyboard.type('5');
  await expect(phone).toHaveValue('(18) 99570-1724');
  expect(await caret()).toBe(8);

  // Apagar o hífen não o remove: o cursor só passa para antes dele.
  await phone.fill('18997017249');
  await phone.evaluate((input: HTMLInputElement) => {
    input.setSelectionRange(11, 11);
  });
  await page.keyboard.press('Backspace');
  await expect(phone).toHaveValue('(18) 99701-7249');
  expect(await caret()).toBe(10);
});

test('o erro do consentimento fica no contêiner do campo', async ({ page }) => {
  const f = form(page);
  await f.submit.click();
  const error = page.locator('[data-field]', { has: f.consent }).getByText(ERRORS.consent);
  await expect(error).toBeVisible();
  await expect(error).not.toHaveAttribute('style');
  await expect(error).toHaveAttribute('id', 'f-lgpd-erro');
  await expect(f.consent).toHaveAttribute('aria-describedby', 'f-lgpd-erro');

  await f.consent.check();
  await expect(error).toBeHidden();
  await expect(f.consent).not.toHaveAttribute('aria-describedby');
});

test('passar o mouse num campo com erro mantém a borda de erro', async ({ page }) => {
  const f = form(page);
  await f.submit.click();
  // O Nome recebe o foco; o WhatsApp fica só com o erro, como quem volta com o mouse.
  await f.phone.hover();
  // A borda tem transição: só a cor final conta, não a que passa no meio do caminho.
  await f.phone.evaluate((field) =>
    Promise.all(field.getAnimations().map((animation) => animation.finished)),
  );
  await expect(f.phone).toHaveCSS('border-color', 'rgb(180, 35, 24)');
});

test('uma mensagem que chega ao limite avisa que o resto fica de fora', async ({
  page,
  openedUrls,
}) => {
  // mata: o aviso de limite no status (contact-form.ts): o maxlength cortava o relato colado em
  // silêncio, e o WhatsApp recebia a mensagem pela metade
  const f = form(page);
  const status = page.locator('[data-form-status]');
  const limit = 'A mensagem chegou ao limite de 1.200 caracteres. O que passar disso fica de fora.';
  await fillValid(page);
  // 1.500 caracteres: o campo fica com os primeiros 1.200.
  await f.message.fill('Relato colado. '.repeat(100));
  expect(await f.message.evaluate((field: HTMLTextAreaElement) => field.value.length)).toBe(1200);
  await expect(status).toHaveText(limit);
  await expect(status).toHaveClass(/is-error/);
  // Abaixo do limite de novo, o aviso sai.
  await f.message.press('Backspace');
  await expect(status).toHaveText('');
  // O envio continua valendo e troca o aviso.
  await f.submit.click();
  await expect(status).toHaveText('Mensagem pronta. Confirme o envio no WhatsApp.');
  await expect(status).not.toHaveClass(/is-error/);
  expect(await openedUrls()).toHaveLength(1);
});

test('abaixo do limite de novo, com campos ainda marcados, o aviso de erros volta', async ({
  page,
}) => {
  // mata: o aviso de limite que, ao sair, deixava o status vazio (contact-form.ts) com o Nome, o
  // WhatsApp e o aceite ainda destacados
  const f = form(page);
  const status = page.locator('[data-form-status]');
  await f.submit.click();
  await expect(status).toHaveText('Revise os campos destacados para continuar.');
  await f.message.fill('Relato colado. '.repeat(100));
  await expect(status).toHaveText(/chegou ao limite/);
  await f.message.press('Backspace');
  await expect(status).toHaveText('Revise os campos destacados para continuar.');
  await expect(status).toHaveClass(/is-error/);
  for (const control of [f.name, f.phone, f.consent]) {
    await expect(control).toHaveAttribute('aria-invalid', 'true');
  }
});

test.describe('hover no aceite', () => {
  /** A cor final da borda da caixa desenhada do aceite, depois da transição. */
  const boxBorder = (page: Page) =>
    page.locator('[data-contact-form] .check-box').evaluate(async (box) => {
      await Promise.all(box.getAnimations().map((animation) => animation.finished));
      return getComputedStyle(box).borderTopColor;
    });

  test('passar o mouse no aceite escurece a borda da caixa, como nos campos', async ({ page }) => {
    // mata: o hover do aceite (forms.css): era o único controle do formulário sem retorno ao
    // ponteiro
    await form(page).consent.hover();
    expect(await boxBorder(page)).toBe('rgb(95, 106, 150)');
  });

  test('com erro, passar o mouse no aceite mantém a borda de erro', async ({ page }) => {
    const f = form(page);
    await f.submit.click();
    await f.consent.hover();
    expect(await boxBorder(page)).toBe('rgb(180, 35, 24)');
  });
});

test.describe('consentimento', () => {
  test('o rótulo cita o aviso de privacidade', async ({ page }) => {
    // O Playwright põe um espaço em volta do aviso sr-only (um bloco, por ser absoluto); o
    // navegador, não: "(abre em outra aba)." (o a11y.spec confere o nome do Chromium).
    await expect(form(page).consent).toHaveAccessibleName(
      /^Concordo com o uso dos meus dados apenas para o retorno deste contato, conforme a LGPD e o aviso de privacidade \(abre em outra aba\) ?\.$/,
    );
  });

  test('o link do aviso abre outra aba e não marca o checkbox', async ({ page }) => {
    const f = form(page);
    const link = page
      .locator('[data-field]', { has: f.consent })
      .getByRole('link', { name: 'aviso de privacidade (abre em outra aba)', exact: true });
    const popup = page.waitForEvent('popup');
    await link.click();
    const opened = await popup;
    await opened.waitForLoadState();
    expect(new URL(opened.url()).pathname).toBe('/privacidade/');
    await opened.close();
    await expect(f.consent).not.toBeChecked();
  });

  test('clicar no texto do rótulo marca o checkbox', async ({ page }) => {
    const f = form(page);
    // O começo do texto, longe do link.
    await page
      .locator('[data-field]', { has: f.consent })
      .getByText(/^Concordo com o uso/)
      .click({ position: { x: 4, y: 4 } });
    await expect(f.consent).toBeChecked();
  });
});

test.describe('lista de assuntos personalizável (appearance: base-select)', () => {
  test.beforeEach(async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'a lista personalizável só existe no Chrome e no Edge');
    const supported = await page.evaluate(() => CSS.supports('appearance', 'base-select'));
    test.skip(!supported, 'este Chromium ainda não tem appearance: base-select');
  });

  /** A opção que tem o foco (dentro da lista aberta). */
  const focusedOption = (page: Page) => page.locator('#f-assunto option:focus-visible');

  for (const forcedColors of ['none', 'active'] as const) {
    test(`a opção focada pelo teclado tem contorno (alto contraste: ${forcedColors})`, async ({
      page,
    }) => {
      // mata: outline: none no option:focus-visible (só o fundo mist, 1,1:1, que some no alto
      // contraste)
      await page.emulateMedia({ forcedColors });
      const { subject } = form(page);
      await subject.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#f-assunto:open')).toHaveCount(1);
      await page.keyboard.press('ArrowDown');
      await expect(focusedOption(page)).toHaveText('Família Internacional');
      await expect(focusedOption(page)).toHaveCSS('outline-style', 'solid');
      await expect(focusedOption(page)).toHaveCSS('outline-width', '2px');
    });
  }

  /** Abre a lista do Assunto pelo teclado; o foco passa para a opção. */
  async function openByKeyboard(page: Page): Promise<Locator> {
    const { subject } = form(page);
    await subject.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#f-assunto:open')).toHaveCount(1);
    await expect(subject).not.toBeFocused();
    return subject;
  }

  for (const forcedColors of ['none', 'active'] as const) {
    test(`com a lista aberta, o campo continua com o contorno do foco (alto contraste: ${forcedColors})`, async ({
      page,
    }) => {
      // mata: a regra .select select:open removida (o foco vai para a opção, e o campo apagava) e,
      // no alto contraste, o :not(:focus) dos campos apagando o contorno da lista aberta
      await page.emulateMedia({ forcedColors });
      const subject = await openByKeyboard(page);
      await expect(subject).toHaveCSS('outline-style', 'solid');
      await expect(subject).toHaveCSS('outline-width', '2px');
    });
  }

  test('com a lista aberta, o contorno e a borda do campo ficam com o azul do foco', async ({
    page,
  }) => {
    // Só fora do alto contraste, que troca as cores pelas do sistema.
    const subject = await openByKeyboard(page);
    await expect(subject).toHaveCSS('outline-color', 'rgb(36, 64, 230)');
    await expect(subject).toHaveCSS('border-top-color', 'rgb(36, 64, 230)');
  });

  test('"Escolha uma área" não parece escolhida: apagada, sem negrito e sem ✓', async ({
    page,
  }) => {
    // mata: option:checked (royal, 600) vencendo a regra da opção vazia
    const empty = page.locator('#f-assunto option[value=""]');
    await expect(empty).toHaveCSS('color', 'rgb(100, 109, 146)');
    await expect(empty).toHaveCSS('font-weight', '400');
    expect(
      await empty.evaluate((option) => getComputedStyle(option, '::checkmark').visibility),
    ).toBe('hidden');
  });

  test('escolher pelo mouse grava o valor e devolve o foco ao campo', async ({ page }) => {
    const { subject } = form(page);
    await subject.click();
    await page.getByRole('option', { name: 'Previdenciário' }).click();
    await expect(subject).toHaveValue('Previdenciário');
    await expect(subject).toBeFocused();
  });
});
