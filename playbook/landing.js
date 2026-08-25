/* ──────────────────────────────────────────────────────────
   FIHAN · Playbook — Landing gratuita (Editais de Fomento)
   Captura o lead num modal (nome, email, telefone, ideia), salva no
   mini-CRM (/api/leads) e dispara o email com o PDF (/api/playbook).
   100% gratuito — sem checkout, sem Hotmart.
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ---------- Meta attribution signals (Conversions API dedup) ---------- */
  const getCookie = (name) => {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  };
  const getFbc = () => {
    const existing = getCookie('_fbc');
    if (existing) return existing;
    const fbclid = new URLSearchParams(location.search).get('fbclid');
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
  };
  const getFbp = () => getCookie('_fbp');
  const newEventId = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ev-' + Date.now() + '-' + Math.random().toString(16).slice(2);

  /* ---------- Inject arrow SVG into [data-arrow] slots ---------- */
  const arrowTpl = document.getElementById('arrow-tpl');
  if (arrowTpl) {
    document.querySelectorAll('[data-arrow]').forEach((slot) => {
      slot.appendChild(arrowTpl.content.cloneNode(true));
    });
  }

  /* ---------- Theme toggle ---------- */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('fihan-theme', next); } catch (e) {}
    });
  }

  const smoothTo = (sel) => {
    const target = document.querySelector(sel);
    if (!target) return;
    const top = target.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  /* ---------- Smooth scroll for plain in-page anchors (not buy buttons) ---------- */
  document.querySelectorAll('a[href^="#"]:not(.js-buy)').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      if (!document.querySelector(id)) return;
      e.preventDefault();
      smoothTo(id);
    });
  });

  /* ---------- Lead modal (captura os dados antes de liberar o download) ---------- */
  const modal = document.getElementById('leadModal');
  const modalForm = document.getElementById('leadModalForm');
  const modalError = document.getElementById('lmError');
  const modalSubmit = document.getElementById('lmSubmit');
  let lastFocus = null;

  const openModal = () => {
    if (!modal) { smoothTo('#comprar'); return; }
    lastFocus = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lm-locked');
    const first = document.getElementById('lmName');
    if (first) setTimeout(() => first.focus(), 60);
  };
  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lm-locked');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  };

  const showModalError = (msg) => {
    if (!modalError) return;
    modalError.textContent = msg;
    modalError.classList.add('is-active');
  };
  const clearFieldErrors = () => {
    modalForm.querySelectorAll('.fihan-input__field.is-invalid')
      .forEach((f) => f.classList.remove('is-invalid'));
    if (modalError) modalError.classList.remove('is-active');
  };

  /* ---------- Buy buttons → abrem o modal ---------- */
  document.querySelectorAll('.js-buy').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  });

  /* ---------- Modal: fechar (overlay, X, Esc) ---------- */
  if (modal) {
    modal.querySelectorAll('[data-close]').forEach((el) =>
      el.addEventListener('click', closeModal)
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });
  }

  /* ---------- Modal: submit → salva lead → libera o download ---------- */
  if (modalForm) {
    modalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      clearFieldErrors();

      const fields = {
        name: document.getElementById('lmName'),
        email: document.getElementById('lmEmail'),
        phone: document.getElementById('lmPhone'),
        idea: document.getElementById('lmIdea'),
      };
      const values = {
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone.value.trim(),
        idea: fields.idea.value.trim(),
        website: modalForm.querySelector('[name="website"]').value, // honeypot
      };

      // Validação — todos obrigatórios
      const invalid = [];
      if (values.name.length < 2) invalid.push('name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) invalid.push('email');
      if (values.phone.replace(/\D/g, '').length < 8) invalid.push('phone');
      if (values.idea.length < 2) invalid.push('idea');
      if (invalid.length) {
        invalid.forEach((k) => fields[k].classList.add('is-invalid'));
        showModalError('Preencha todos os campos corretamente para continuar.');
        fields[invalid[0]].focus();
        return;
      }

      // event_id compartilhado (dedup Pixel ↔ Conversions API)
      const eventId = newEventId();
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', {
          content_name: 'Playbook Editais de Fomento',
          content_type: 'product',
          value: 0,
          currency: 'BRL',
        }, { eventID: eventId });
      }

      values.meta = {
        eventId,
        sourceUrl: location.href,
        fbp: getFbp(),
        fbc: getFbc(),
      };

      modalSubmit.disabled = true;
      modalSubmit.textContent = 'Enviando…';

      // Salva o lead no mini-CRM e dispara o email com o PDF. Nunca bloqueia:
      // em qualquer desfecho, segue pra página de agradecimento com o link
      // de download direto (o PDF é público, então o acesso nunca falha).
      const proceed = () => {
        closeModal();
        const q = new URLSearchParams({ name: values.name, email: values.email });
        window.location.href = '/playbook/obrigado.html?' + q.toString();
      };

      Promise.allSettled([
        fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }),
        fetch('/api/playbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        }),
      ]).then(proceed);
    });
  }

  /* ---------- Sticky mobile CTA visibility ---------- */
  const sticky = document.getElementById('stickyCta');
  if (sticky) {
    const footer = document.querySelector('.footer');
    const onScroll = () => {
      const scrolled = window.pageYOffset > 720;
      // esconde quando o rodapé (com CTA final) está visível
      let nearEnd = false;
      if (footer) {
        const r = footer.getBoundingClientRect();
        nearEnd = r.top < window.innerHeight + 40;
      }
      sticky.classList.toggle('is-visible', scrolled && !nearEnd);
      sticky.setAttribute('aria-hidden', scrolled && !nearEnd ? 'false' : 'true');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  }
})();
