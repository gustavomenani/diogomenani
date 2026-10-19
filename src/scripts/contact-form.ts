import { buildContactMessage, waLink } from '../lib/whatsapp';
import { CONTACT_FIELDS, validateContact } from './contact-validation';
import { maskPhone } from './phone-mask';

type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** O botão de envio fica bloqueado por este tempo, para evitar envios repetidos. */
const SUBMIT_COOLDOWN_MS = 1800;
const STATUS = {
  invalid: 'Revise os campos destacados para continuar.',
  sent: 'Mensagem pronta. Abrindo o WhatsApp…',
} as const;

function controlOf<T extends Control>(
  form: HTMLFormElement,
  name: string,
  type: abstract new () => T,
): T | null {
  const control = form.elements.namedItem(name);
  return control instanceof type ? control : null;
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
  const form = root.querySelector('[data-contact-form]');
  if (!(form instanceof HTMLFormElement)) return;

  const name = controlOf(form, 'nome', HTMLInputElement);
  const phone = controlOf(form, 'telefone', HTMLInputElement);
  const email = controlOf(form, 'email', HTMLInputElement);
  const subject = controlOf(form, 'assunto', HTMLSelectElement);
  const message = controlOf(form, 'mensagem', HTMLTextAreaElement);
  const consent = controlOf(form, 'lgpd', HTMLInputElement);
  if (!name || !phone || !email || !subject || !message || !consent) {
    // Um markup incompleto desliga só o formulário; o resto da página continua funcionando.
    console.error('Formulário de contato incompleto: envio pelo WhatsApp desativado.');
    return;
  }
  const fields = { name, phone, email, subject, message, consent };
  const status = form.querySelector('[data-form-status]');
  const fallback = form.querySelector<HTMLAnchorElement>('[data-form-fallback]');
  const submit = form.querySelector<HTMLButtonElement>('[type="submit"]');

  const showStatus = (text: string, isError: boolean) => {
    if (!status) return;
    // classList (e não className): a classe de escopo do Astro precisa continuar no elemento.
    status.classList.toggle('is-error', isError);
    status.textContent = text;
  };

  // Cada controle mora num contêiner [data-field], que guarda a mensagem de erro dele.
  const setError = (control: Control, invalid: boolean) => {
    const container = control.closest('[data-field]');
    container?.classList.toggle('has-error', invalid);
    const error = container?.querySelector('[data-field-error]');
    if (invalid && error) control.setAttribute('aria-describedby', error.id);
    else control.removeAttribute('aria-describedby');
    control.setAttribute('aria-invalid', String(invalid));
  };

  // Ao editar um campo marcado, o erro dele sai (o próximo envio confere de novo); sem erros
  // restantes, o aviso também.
  const onEdit = (target: EventTarget | null) => {
    if (!isControl(target) || target.getAttribute('aria-invalid') !== 'true') return;
    setError(target, false);
    if (!form.querySelector('[aria-invalid="true"]')) showStatus('', false);
  };

  form.addEventListener('input', (event) => {
    if (event.target === phone) {
      const masked = maskPhone(phone.value, phone.selectionStart ?? phone.value.length);
      if (phone.value !== masked.value) {
        phone.value = masked.value;
        if (document.activeElement === phone) phone.setSelectionRange(masked.caret, masked.caret);
      }
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
    for (const field of CONTACT_FIELDS) setError(fields[field], invalid.includes(field));

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
