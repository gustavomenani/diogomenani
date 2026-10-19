import { buildContactMessage, waLink } from '../lib/whatsapp';
import { validateContact, type ContactField } from './contact-validation';
import { maskPhone } from './phone-mask';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** O botão de envio fica bloqueado por este tempo, para evitar envios repetidos. */
const SUBMIT_COOLDOWN_MS = 1800;
const STATUS = {
  invalid: 'Revise os campos destacados para continuar.',
  sent: 'Mensagem pronta. Abrindo o WhatsApp…',
} as const;
/** Campos validados, na ordem do formulário. */
const VALIDATED: readonly ContactField[] = ['name', 'phone', 'email', 'message', 'consent'];

function controlOf<T extends Control>(
  form: HTMLFormElement,
  name: string,
  type: abstract new () => T,
): T {
  const control = form.elements.namedItem(name);
  if (control instanceof type) return control;
  throw new Error(`O formulário de contato não tem o campo "${name}".`);
}

const isControl = (target: EventTarget | null): target is Control =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

/**
 * Formulário de contato: valida os campos e entrega ao WhatsApp a mensagem já montada.
 * Depende de JavaScript por design; sem ele, o visitante usa os botões do WhatsApp.
 */
export function initContactForm(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const fields = {
    name: controlOf(form, 'nome', HTMLInputElement),
    phone: controlOf(form, 'telefone', HTMLInputElement),
    email: controlOf(form, 'email', HTMLInputElement),
    subject: controlOf(form, 'assunto', HTMLSelectElement),
    message: controlOf(form, 'mensagem', HTMLTextAreaElement),
    consent: controlOf(form, 'lgpd', HTMLInputElement),
  };
  const status = form.querySelector('[data-form-status]');
  const fallback = form.querySelector<HTMLAnchorElement>('[data-form-fallback]');
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');

  const showStatus = (text: string, isError: boolean) => {
    if (!status) return;
    // classList (e não className): a classe de escopo do Astro precisa continuar no elemento.
    status.classList.toggle('is-error', isError);
    status.textContent = text;
  };

  // Cada campo acha o seu erro pelo contêiner; o consentimento ainda é um caso à parte.
  const errorOf = (control: Control): HTMLElement | null =>
    control === fields.consent
      ? document.getElementById('e-lgpd')
      : (control.closest('[data-field]')?.querySelector<HTMLElement>('[data-field-error]') ?? null);

  const setError = (control: Control, invalid: boolean) => {
    (control.closest('[data-field]') ?? control.closest('.check'))?.classList.toggle(
      'has-error',
      invalid,
    );
    const error = errorOf(control);
    if (error && control === fields.consent) error.style.display = invalid ? 'block' : '';
    if (invalid && error) control.setAttribute('aria-describedby', error.id);
    else control.removeAttribute('aria-describedby');
    control.setAttribute('aria-invalid', String(invalid));
  };

  // Ao corrigir um campo marcado, o erro dele sai; sem erros restantes, o aviso também.
  const onEdit = (target: EventTarget | null) => {
    if (!isControl(target) || target.getAttribute('aria-invalid') !== 'true') return;
    setError(target, false);
    if (!form.querySelector('.has-error')) showStatus('', false);
  };

  form.addEventListener('input', (event) => {
    if (event.target === fields.phone) {
      const masked = maskPhone(fields.phone.value);
      if (fields.phone.value !== masked) fields.phone.value = masked;
    }
    onEdit(event.target);
  });
  form.addEventListener('change', (event) => {
    onEdit(event.target);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const request = {
      name: fields.name.value,
      phone: fields.phone.value,
      email: fields.email.value,
      subject: fields.subject.value,
      message: fields.message.value,
    };
    const invalid = validateContact({ ...request, consent: fields.consent.checked });
    for (const field of VALIDATED) setError(fields[field], invalid.includes(field));

    const firstInvalid = invalid[0];
    if (firstInvalid) {
      fields[firstInvalid].focus();
      showStatus(STATUS.invalid, true);
      fallback?.classList.remove('is-shown');
      return;
    }

    const url = waLink(buildContactMessage(request));
    if (submit) {
      submit.classList.add('is-loading');
      submit.disabled = true;
    }
    showStatus(STATUS.sent, false);
    // Se o navegador bloquear a nova aba, o link de reserva leva à mesma mensagem.
    if (fallback) {
      fallback.href = url;
      fallback.classList.add('is-shown');
    }
    window.open(url, '_blank', 'noopener');
    setTimeout(() => {
      if (submit) {
        submit.classList.remove('is-loading');
        submit.disabled = false;
      }
    }, SUBMIT_COOLDOWN_MS);
  });
}
