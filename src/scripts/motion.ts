/**
 * Comportamento da landing page: revelações na rolagem, balança da Têmis,
 * header, menu mobile, FAQ e formulário que monta a mensagem do WhatsApp.
 *
 * Os estados escondidos só valem depois que o script define data-motion="on":
 * sem JavaScript, ou com "reduzir movimento", todo o conteúdo aparece direto.
 */

type Mode = 'on' | 'static' | 'reduced';
type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const EXPO = 'cubic-bezier(.16,1,.3,1)';

export function initLanding(root: HTMLElement): void {
  const win = window;
  const doc = document;
  const $ = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const $$ = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const whatsapp = root.dataset.whatsapp ?? '';
  const wa = (text: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`;
  const setText = (el: Element | null, text: string) => {
    if (!el) return;
    const node = el.firstChild && el.firstChild.nodeType === Node.TEXT_NODE ? el.firstChild : null;
    if (node) node.nodeValue = text;
    else el.textContent = text;
  };

  // A página "estática" é a que não rola (ex.: captura da página inteira): mostra tudo pronto.
  const reduce = win.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isStatic = () => doc.documentElement.scrollHeight - win.innerHeight < win.innerHeight * 0.5;
  let mode: Mode = reduce ? 'reduced' : isStatic() ? 'static' : 'on';
  root.dataset.motion = mode;

  /* --- revelações na rolagem --- */
  for (const list of $$('[data-reveal-list]')) {
    Array.from(list.children).forEach((child, i) => {
      const el = child as HTMLElement;
      if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', 'item');
      el.style.setProperty('--d', `${Math.min(i * 90, 540)}ms`);
    });
  }
  const revealEls = $$('[data-reveal]');
  if (mode === 'on' && 'IntersectionObserver' in win) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add('is-in');
          io.unobserve(el);
          const delay = parseFloat(el.style.getPropertyValue('--d')) || 0;
          setTimeout(() => el.style.removeProperty('--d'), delay + 1500);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 },
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* --- balança da Têmis: oscila até se equilibrar (mola amortecida) --- */
  const beam = $<SVGGElement>('[data-beam]');
  const panL = $<SVGGElement>('[data-pan-l]');
  const panR = $<SVGGElement>('[data-pan-r]');
  const pivotOf = (el: Element | null) => el?.getAttribute('data-pivot') ?? '0 0';
  const [lx, ly] = pivotOf(panL).split(' ').map(Number);
  const [rx, ry] = pivotOf(panR).split(' ').map(Number);
  // Ângulo que deixa os dois pratos na mesma altura (o desenho original vem inclinado).
  const LEVEL = (-Math.atan2(ry - ly, rx - lx) * 180) / Math.PI;
  let angle = 0;
  let angleV = 0;
  let pans = 0;
  let pansV = 0;
  let raf = 0;
  let t0 = 0;
  const pose = () => {
    if (!beam || !panL || !panR) return;
    beam.setAttribute('transform', `rotate(${angle.toFixed(3)} ${pivotOf(beam)})`);
    const p = (pans - angle).toFixed(3);
    panL.setAttribute('transform', `rotate(${p} ${pivotOf(panL)})`);
    panR.setAttribute('transform', `rotate(${p} ${pivotOf(panR)})`);
  };
  const tick = (t: number) => {
    const dt = Math.min(0.034, Math.max(0.001, (t - t0) / 1000));
    t0 = t;
    const acc = -13 * (angle - LEVEL) - 2.75 * angleV;
    angleV += acc * dt;
    angle += angleV * dt;
    // Os pratos atrasam como pêndulos, empurrados pela aceleração do travessão.
    const accP = -32 * pans - 2.8 * pansV - 0.55 * acc;
    pansV += accP * dt;
    pans += pansV * dt;
    pose();
    if (Math.abs(angle - LEVEL) < 0.01 && Math.abs(angleV) < 0.02 && Math.abs(pans) < 0.01 && Math.abs(pansV) < 0.02) {
      angle = LEVEL;
      pans = angleV = pansV = 0;
      pose();
      raf = 0;
      return;
    }
    raf = requestAnimationFrame(tick);
  };
  const swing = (impulse = 0) => {
    if (!beam || mode === 'reduced') return;
    angleV += impulse;
    if (!raf) {
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    }
  };
  if (beam) {
    if (mode === 'reduced') {
      angle = LEVEL;
      pose();
    } else {
      setTimeout(() => swing(), 950);
    }
  }

  /* --- seletor de tema → botão do WhatsApp --- */
  const swapLabel = (cta: HTMLElement, label: HTMLElement, text: string) => {
    if (mode === 'reduced' || typeof label.animate !== 'function') {
      setText(label, text);
      return;
    }
    const w0 = cta.getBoundingClientRect().width;
    const out = label.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-45%)' }],
      { duration: 150, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' },
    );
    out.onfinish = () => {
      setText(label, text);
      const w1 = cta.getBoundingClientRect().width;
      out.cancel();
      label.animate([{ opacity: 0, transform: 'translateY(45%)' }, { opacity: 1, transform: 'none' }], { duration: 460, easing: EXPO });
      cta.animate([{ width: `${w0}px` }, { width: `${w1}px` }], { duration: 520, easing: EXPO });
    };
  };
  const onTopic = (input: HTMLInputElement) => {
    const cta = $<HTMLAnchorElement>('[data-wa-cta]');
    const label = $('[data-wa-label]');
    const { href, cta: text } = input.dataset;
    if (!cta || !label || !href || !text) return;
    cta.href = href;
    swapLabel(cta, label, text);
    swing((Math.random() < 0.5 ? -1 : 1) * 24);
  };

  /* --- menu mobile --- */
  const header = $('[data-header]');
  const menuEl = $('[data-menu]');
  const toggleEl = $<HTMLButtonElement>('[data-menu-toggle]');
  let menuOpen = false;
  const setMenu = (open: boolean) => {
    if (!menuEl || !toggleEl) return;
    menuOpen = open;
    root.classList.toggle('menu-open', open);
    toggleEl.setAttribute('aria-expanded', String(open));
    toggleEl.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    setText($('[data-menu-text]'), open ? 'Fechar' : 'Menu');
    if (open) {
      menuEl.removeAttribute('inert');
      menuEl.setAttribute('aria-hidden', 'false');
      doc.documentElement.style.overflow = 'hidden';
      header?.classList.remove('is-tucked');
      setTimeout(() => {
        if (menuOpen) menuEl.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
      }, 380);
    } else {
      menuEl.setAttribute('inert', '');
      menuEl.setAttribute('aria-hidden', 'true');
      doc.documentElement.style.overflow = '';
    }
  };
  setMenu(false);
  toggleEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) setMenu(false);
  });
  menuEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setMenu(false);
      toggleEl?.focus();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(menuEl.querySelectorAll('a'));
    if (!e.shiftKey && doc.activeElement === items[items.length - 1]) {
      e.preventDefault();
      toggleEl?.focus();
    }
  });

  /* --- FAQ --- */
  const toggleFaq = (btn: HTMLElement) => {
    const item = btn.closest('.faq-item');
    if (!item) return;
    const open = !item.classList.contains('is-open');
    item.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  /* --- formulário: valida e entrega a mensagem pronta ao WhatsApp --- */
  const errorFor: Record<string, string> = { nome: 'e-nome', telefone: 'e-tel', email: 'e-email', mensagem: 'e-msg', lgpd: 'e-lgpd' };
  const formStatus = (form: HTMLFormElement, text: string, isError: boolean) => {
    const status = form.querySelector('[data-form-status]');
    if (!status) return;
    status.className = `form-status${isError ? ' is-error' : ''}`;
    setText(status, text);
  };
  const setError = (el: Field, on: boolean) => {
    (el.closest('.field') ?? el.closest('.check'))?.classList.toggle('has-error', on);
    const id = errorFor[el.name];
    const msg = id ? doc.getElementById(id) : null;
    if (msg && el.name === 'lgpd') msg.style.display = on ? 'block' : '';
    if (on && id) el.setAttribute('aria-describedby', id);
    else el.removeAttribute('aria-describedby');
    el.setAttribute('aria-invalid', on ? 'true' : 'false');
  };
  const maskPhone = (tel: HTMLInputElement) => {
    let d = tel.value.replace(/\D/g, '');
    if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
    d = d.slice(0, 11);
    let v = d;
    if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length > 6) v = `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(d.length - 4)}`;
    if (tel.value !== v) tel.value = v;
  };
  const isField = (t: EventTarget | null): t is Field =>
    t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement;
  const onFieldEdit = (target: EventTarget | null) => {
    if (!isField(target) || target.getAttribute('aria-invalid') !== 'true') return;
    setError(target, false);
    const form = target.closest<HTMLFormElement>('[data-contact-form]');
    if (form && !form.querySelector('.has-error')) formStatus(form, '', false);
  };
  const onSubmit = (form: HTMLFormElement) => {
    const field = <T extends Field>(name: string) => form.elements.namedItem(name) as T;
    const nome = field<HTMLInputElement>('nome');
    const telefone = field<HTMLInputElement>('telefone');
    const email = field<HTMLInputElement>('email');
    const assunto = field<HTMLSelectElement>('assunto');
    const mensagem = field<HTMLTextAreaElement>('mensagem');
    const lgpd = field<HTMLInputElement>('lgpd');
    const invalid: Field[] = [];
    if (!nome.value.trim()) invalid.push(nome);
    if (telefone.value.replace(/\D/g, '').length < 10) invalid.push(telefone);
    if (email.value.trim() && !/^\S+@\S+\.\S+$/.test(email.value.trim())) invalid.push(email);
    if (!mensagem.value.trim()) invalid.push(mensagem);
    if (!lgpd.checked) invalid.push(lgpd);
    [nome, telefone, email, mensagem, lgpd].forEach((el) => setError(el, invalid.includes(el)));
    const fallback = form.querySelector<HTMLAnchorElement>('[data-form-fallback]');
    if (invalid.length) {
      invalid[0].focus();
      formStatus(form, 'Revise os campos destacados para continuar.', true);
      fallback?.classList.remove('is-shown');
      return;
    }
    const text =
      `Olá, Dr. Diogo! Meu nome é ${nome.value.trim()}.` +
      (assunto.value ? ` Assunto: ${assunto.value}.` : '') +
      ` ${mensagem.value.trim()}` +
      ` (WhatsApp: ${telefone.value}${email.value.trim() ? `, e-mail: ${email.value.trim()}` : ''})`;
    const url = wa(text);
    const btn = form.querySelector<HTMLButtonElement>('[type="submit"]');
    if (btn) {
      btn.classList.add('is-loading');
      btn.disabled = true;
    }
    formStatus(form, 'Mensagem pronta. Abrindo o WhatsApp…', false);
    if (fallback) {
      fallback.href = url;
      fallback.classList.add('is-shown');
    }
    win.open(url, '_blank', 'noopener');
    setTimeout(() => {
      if (btn) {
        btn.classList.remove('is-loading');
        btn.disabled = false;
      }
    }, 1800);
  };

  /* --- eventos delegados a partir da raiz --- */
  root.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const faqBtn = t.closest<HTMLElement>('[data-faq-btn]');
    if (faqBtn) {
      toggleFaq(faqBtn);
      return;
    }
    if (t.closest('[data-menu-toggle]')) {
      setMenu(!menuOpen);
      return;
    }
    if (menuOpen && t.closest('a')) setMenu(false);
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.closest('[data-topic]')) {
      onTopic(t);
      return;
    }
    onFieldEdit(t);
  });
  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.name === 'telefone' && t.closest('[data-contact-form]')) maskPhone(t);
    onFieldEdit(t);
  });
  root.addEventListener('submit', (e) => {
    const form = e.target instanceof Element ? e.target.closest<HTMLFormElement>('[data-contact-form]') : null;
    if (!form) return;
    e.preventDefault();
    onSubmit(form);
  });

  /* --- estado ligado à rolagem: header, progresso, parallax, menu ativo, etapas, frase, botão flutuante --- */
  const progress = $('[data-progress]');
  const figure = $('[data-figure]');
  const glow = $('[data-glow]');
  const hero = $('[data-hero]');
  const fab = $('[data-fab]');
  const contactSection = $('#contato');
  const footer = $('[data-footer]');
  const nav = $('[data-nav]');
  const indicator = $('[data-nav-ind]');
  const navLinks = $$<HTMLAnchorElement>('[data-nav] a[href^="#"]');
  const sections = navLinks.map((l) => (l.hash ? $(l.hash) : null)).filter((s): s is HTMLElement => s !== null);
  const stepEls = $$('[data-step]');
  const statement = $('[data-statement]');
  const words = statement ? Array.from(statement.querySelectorAll('.sw')) : [];
  let heroH = hero?.offsetHeight ?? 0;
  let lastY = win.scrollY;
  let activeId: string | null | undefined = null;
  let lit = -1;
  let ticking = false;

  const moveIndicator = (link?: HTMLElement) => {
    if (!indicator || !nav) return;
    if (!link) {
      indicator.style.opacity = '0';
      return;
    }
    const nr = nav.getBoundingClientRect();
    const lr = link.getBoundingClientRect();
    indicator.style.opacity = '1';
    indicator.style.transform = `translateX(${(lr.left - nr.left).toFixed(1)}px) scaleX(${lr.width.toFixed(1)})`;
  };
  const updateSteps = (vh: number) => {
    if (mode !== 'on' || !stepEls.length) return;
    const r0 = stepEls[0].getBoundingClientRect();
    const inRow = Math.abs(stepEls[stepEls.length - 1].getBoundingClientRect().top - r0.top) < 4;
    let n = 0;
    if (inRow) {
      const p = (vh * 0.86 - r0.top) / (vh * 0.42);
      n = p <= 0 ? 0 : Math.min(stepEls.length, 1 + Math.floor(clamp(p, 0, 1) * (stepEls.length - 1) + 1e-6));
    } else {
      stepEls.forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.7) n++;
      });
    }
    stepEls.forEach((el, i) => {
      el.classList.toggle('is-active', i < n);
      el.classList.toggle('is-done', i < n - 1);
    });
  };
  const updateStatement = (vh: number) => {
    if (mode !== 'on' || !statement) return;
    const r = statement.getBoundingClientRect();
    const p = clamp((vh * 0.9 - r.top) / (r.height + vh * 0.32), 0, 1);
    const n = Math.round(p * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => w.classList.toggle('lit', i < n));
  };
  const update = () => {
    ticking = false;
    const y = win.scrollY;
    const vh = win.innerHeight;
    const max = Math.max(1, doc.documentElement.scrollHeight - vh);
    if (header) {
      header.classList.toggle('is-scrolled', y > 24);
      if (mode === 'on' && !menuOpen && y > heroH * 0.85 && y > lastY + 4) header.classList.add('is-tucked');
      else if (y < lastY - 4 || y <= heroH * 0.85) header.classList.remove('is-tucked');
    }
    lastY = y;
    if (progress) progress.style.transform = `scaleX(${(y / max).toFixed(4)})`;
    if (mode === 'on' && y < heroH * 1.2) {
      if (figure) figure.style.transform = `translate3d(0,${(y * 0.16).toFixed(1)}px,0)`;
      if (glow) glow.style.transform = `translate3d(0,${(y * 0.32).toFixed(1)}px,0)`;
    }
    let current: HTMLElement | null = null;
    if (mode !== 'static') {
      for (const sec of sections) if (sec.getBoundingClientRect().top <= vh * 0.4) current = sec;
    }
    const id = current ? current.id : null;
    if (id !== activeId) {
      activeId = id;
      let activeLink: HTMLElement | undefined;
      for (const link of navLinks) {
        const on = link.hash === `#${id}`;
        link.classList.toggle('is-active', on);
        if (on) {
          link.setAttribute('aria-current', 'true');
          activeLink = link;
        } else {
          link.removeAttribute('aria-current');
        }
      }
      moveIndicator(activeLink);
    }
    if (fab) {
      const cr = contactSection?.getBoundingClientRect();
      const fr = footer?.getBoundingClientRect();
      const nearEnd = (cr && cr.top < vh * 0.8 && cr.bottom > 0) || (fr && fr.top < vh);
      fab.classList.toggle('is-visible', mode !== 'static' && y > heroH * 0.75 && !nearEnd);
    }
    updateSteps(vh);
    updateStatement(vh);
  };
  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  const onResize = () => {
    heroH = hero?.offsetHeight ?? 0;
    if (mode === 'static' && !isStatic()) {
      mode = 'on';
      root.dataset.motion = 'on';
    }
    if (menuOpen && win.innerWidth >= 1080) setMenu(false);
    activeId = undefined;
    onScroll();
  };
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', onResize, { passive: true });
  doc.fonts.ready.then(onResize);
  update();
}
