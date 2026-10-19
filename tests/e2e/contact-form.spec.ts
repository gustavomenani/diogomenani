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
