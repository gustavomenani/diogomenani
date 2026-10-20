import { test, expect, wa, type Page } from './fixtures';

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
    submit: page.getByRole('button', { name: 'Enviar pelo WhatsApp', exact: true }),
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

test('envio válido abre o WhatsApp com a mensagem montada', async ({ page, openedUrls }) => {
  const f = form(page);
  await fillValid(page);
  await f.email.fill('ana@email.com');
  await f.subject.selectOption('Direito do Trabalho');
  await f.submit.click();

  const expected = wa(
    'Olá, Dr. Diogo! Meu nome é Ana Souza. Assunto: Direito do Trabalho. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249, e-mail: ana@email.com)',
  );
  expect(await openedUrls()).toEqual([expected]);
  await expect(page.getByText('Mensagem pronta. Abrindo o WhatsApp…')).toBeVisible();
  const fallback = page.getByRole('link', {
    name: 'Se o WhatsApp não abriu, toque aqui para enviar a mensagem.',
  });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveAttribute('href', expected);
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
    name: 'Se o WhatsApp não abriu, toque aqui para enviar a mensagem.',
  });
  await expect(fallback).toBeVisible();
  // O link levaria a mensagem antiga.
  await f.message.fill('Outra mensagem.');
  await expect(fallback).toBeHidden();
  await expect(page.getByText('Mensagem pronta. Abrindo o WhatsApp…')).toBeHidden();
});

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
      'Olá, Dr. Diogo! Meu nome é Ana Souza. Fui demitida sem receber as verbas. (WhatsApp: (18) 99701-7249)',
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
