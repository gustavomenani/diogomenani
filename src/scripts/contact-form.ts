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
  const status = form.querySelector('[data-form-status]');
  const fallbackElement = form.querySelector('[data-form-fallback]');
  const fallback = fallbackElement instanceof HTMLAnchorElement ? fallbackElement : null;
  const submit = form.querySelector('[type="submit"]');

  const name = controlOf(form, 'nome', HTMLInputElement);
  const phone = controlOf(form, 'telefone', HTMLInputElement);
  const email = controlOf(form, 'email', HTMLInputElement);
  const subject = controlOf(form, 'assunto', HTMLSelectElement);
  const message = controlOf(form, 'mensagem', HTMLTextAreaElement);
  const consent = controlOf(form, 'lgpd', HTMLInputElement);
  if (!name || !phone || !email || !subject || !message || !consent) {
    // Um markup incompleto desliga só a validação: enviar não recarrega a página, e o link de
    // reserva leva ao WhatsApp. O resto da página continua funcionando.
    console.error('Formulário de contato incompleto: o envio fica pelo link do WhatsApp.');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      fallback?.classList.add('is-shown');
    });
    return;
  }
  const fields = { name, phone, email, subject, message, consent };

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
  // restantes, o aviso também. Depois de um envio, editar esconde o link de reserva, que levaria
  // a mensagem antiga.
  const onEdit = (target: EventTarget | null) => {
    if (fallback?.classList.contains('is-shown')) {
      fallback.classList.remove('is-shown');
      showStatus('', false);
    }
    if (!isControl(target) || target.getAttribute('aria-invalid') !== 'true') return;
    setError(target, false);
    if (!form.querySelector('[aria-invalid="true"]')) showStatus('', false);
  };

  const applyPhoneMask = () => {
    const masked = maskPhone(phone.value, phone.selectionStart ?? phone.value.length);
    if (phone.value === masked.value) return;
    phone.value = masked.value;
    if (document.activeElement === phone) phone.setSelectionRange(masked.caret, masked.caret);
  };

  form.addEventListener('input', (event) => {
    // Durante a composição (IME), o texto ainda é do teclado: a máscara espera o fim dela.
    const composing = event instanceof InputEvent && event.isComposing;
    if (event.target === phone && !composing) applyPhoneMask();
    onEdit(event.target);
  });
  phone.addEventListener('compositionend', applyPhoneMask);
  form.addEventListener('change', (event) => {
    onEdit(event.target);
  });

  // aria-disabled, e não disabled: desabilitar o botão focado jogaria o foco para o corpo.
  let coolingDown = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (coolingDown) return;
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
      // Cada navegador rola o campo focado de um jeito (o Safari o deixa sob o header): o
      // primeiro erro vai para o meio da tela.
      const control = fields[firstInvalid];
      control.focus({ preventScroll: true });
      control.scrollIntoView({ block: 'center', behavior: 'instant' });
      showStatus(STATUS.invalid, true);
      fallback?.classList.remove('is-shown');
      return;
    }

    const url = waLink(buildContactMessage(request));
    coolingDown = true;
    submit?.classList.add('is-loading');
    submit?.setAttribute('aria-disabled', 'true');
    showStatus(STATUS.sent, false);
    // Se o navegador bloquear a nova aba, o link de reserva leva à mesma mensagem.
    if (fallback) {
      fallback.href = url;
      fallback.classList.add('is-shown');
    }
    window.open(url, '_blank', 'noopener');
    setTimeout(() => {
      coolingDown = false;
      submit?.classList.remove('is-loading');
      submit?.removeAttribute('aria-disabled');
    }, SUBMIT_COOLDOWN_MS);
  });
}
