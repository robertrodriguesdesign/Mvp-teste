/* ──────────────────────────────────────────────────────────
   FIHAN · Playbook — Sales page (Editais de Fomento · Lote 0 a R$ 35,
   sobe para R$ 55 no próximo lote)
   Captura o lead num modal (nome, email, telefone, ideia) e salva no
   mini-CRM (/api/leads) ANTES de redirecionar pro checkout da Hotmart.
   ────────────────────────────────────────────────────────── */

(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════
     ⚠️  LINK DE CHECKOUT DA HOTMART
     Cole aqui a URL de checkout quando ela estiver pronta.
     Enquanto estiver com o placeholder abaixo, os botões
     mostram um aviso e rolam até a seção de compra.
     ════════════════════════════════════════════════════════ */
  const CHECKOUT_URL = 'https://pay.hotmart.com/U106593671N';
  const PRICE = 35.0;
  const NEXT_PRICE = 55.0;

  const checkoutReady = CHECKOUT_URL && !/COLAR_LINK_HOTMART_AQUI/.test(CHECKOUT_URL);

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

  /* ---------- Toast ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  const showToast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 3800);
  };

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

  /* ---------- Redireciona pro checkout Hotmart (com atribuição) ---------- */
  const goToCheckout = () => {
    if (!checkoutReady) {
      showToast('🔗 O link de checkout da Hotmart será conectado aqui.');
      smoothTo('#comprar');
      return;
    }
    let url = CHECKOUT_URL;
    const fbc = getFbc();
    if (fbc) {
      url += (url.includes('?') ? '&' : '?') + 'xcod=' + encodeURIComponent(fbc);
    }
    window.location.href = url;
  };

  /* ---------- Lead modal (captura os dados antes do checkout) ---------- */
  const modal = document.getElementById('leadModal');
  const modalForm = document.getElementById('leadModalForm');
  const modalError = document.getElementById('lmError');
  const modalSubmit = document.getElementById('lmSubmit');
  let lastFocus = null;

  const openModal = () => {
    if (!modal) { goToCheckout(); return; }
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

  /* ---------- Modal: submit → salva lead → checkout ---------- */
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
        window.fbq('track', 'InitiateCheckout', {
          content_name: 'Playbook Editais de Fomento',
          content_type: 'product',
          value: PRICE,
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
      const originalLabel = modalSubmit.innerHTML;
      modalSubmit.textContent = 'Salvando…';

      // Salva o lead no CRM. Nunca bloqueia a venda: em qualquer desfecho,
      // segue pro checkout depois de tentar salvar.
      const proceed = () => { closeModal(); goToCheckout(); };

      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
        .then((r) => r.json().catch(() => ({})))
        .then(() => proceed())
        .catch(() => proceed());
    });
  }

  /* ---------- Barra de progresso do lote 0 (vendas reais / meta do lote) ------
     Busca /api/sales-count e atualiza todas as barras da página. As vendas são
     marcadas pelo webhook da Hotmart, então a barra cresce sozinha a partir do
     zero. Se a API falhar, mantém o valor estático que já está no HTML. */
  const reduceMotion =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const countUp = (el, target) => {
    const start = parseInt(el.textContent, 10) || 0;
    if (start === target || reduceMotion) { el.textContent = target; return; }
    const dur = 900;
    let t0 = null;
    const tick = (now) => {
      if (t0 === null) t0 = now;
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(start + (target - start) * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const paintScarcity = (sold, total) => {
    if (!total || total < 1) total = 50;
    const pct = Math.min(100, (sold / total) * 100);
    document.querySelectorAll('.js-scarcity-total').forEach((el) => { el.textContent = total; });
    document.querySelectorAll('.js-scarcity-fill').forEach((el) => { el.style.width = pct.toFixed(1) + '%'; });
    document.querySelectorAll('.js-scarcity-sold').forEach((el) => countUp(el, sold));
    // Lote ainda zerado → mantém o varrimento no trilho vazio
    document.querySelectorAll('.js-scarcity').forEach((el) => {
      el.classList.toggle('is-empty', sold <= 0);
    });
    if (sold >= total) {
      document.querySelectorAll('.js-scarcity .scarcity__note').forEach((el) => {
        el.textContent =
          'Lote 0 esgotado — as próximas cópias saem por R$ ' + NEXT_PRICE.toFixed(0) + '.';
      });
    }
  };

  if (document.querySelector('.js-scarcity')) {
    fetch('/api/sales-count', { headers: { Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && typeof d.sold === 'number') paintScarcity(d.sold, d.total); })
      .catch(() => { /* mantém o fallback do HTML */ });
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
