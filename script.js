/* ================================================================
   FIHAN — script.js
   Form multi-step, máscara, validação, menu mobile, scroll reveal
   ================================================================ */

(function () {
  'use strict';

  /* ---------- Analytics helpers (GA4 + Google Ads via gtag.js) ---------- */
  const GA_ADS_ID = 'AW-18251504035';
  // Ação "Lead — Form Fihan" (Categoria: Inscrição, Janela: 90d clique / 1d view)
  const GA_ADS_LEAD_SEND_TO = `${GA_ADS_ID}/MrHKCISGx8EcEKOz__5D`;

  const ga = (...args) => {
    if (typeof window.gtag === 'function') return window.gtag(...args);
    (window.dataLayer = window.dataLayer || []).push(args);
  };

  /* ---------- Meta Pixel helpers (Facebook/Instagram Ads) ---------- */
  const META_PIXEL_ID = '888400407002791';
  // Standard events -> fbq('track', ...); journey/custom events -> fbq('trackCustom', ...)
  // eventID lets the browser Pixel and the server Conversions API dedupe a shared event.
  const fbStd = (name, params = {}, eventID) => {
    if (typeof window.fbq !== 'function') return;
    if (eventID) window.fbq('track', name, params, { eventID });
    else window.fbq('track', name, params);
  };
  const fbCustom = (name, params = {}) => {
    if (typeof window.fbq === 'function') window.fbq('trackCustom', name, params);
  };

  // track() fires BOTH GA4 and the Meta Pixel so a single call mirrors the
  // event to both platforms. Pass `fb` to control how the Pixel sees it:
  //   { fb: { std: 'Lead', params: {...}, eventID } } -> fbq('track', 'Lead', ..., {eventID})
  //   { fb: { custom: 'CTAClick', params: {} } }      -> fbq('trackCustom', 'CTAClick', ...)
  //   { fb: false }                                   -> GA4 only, skip the Pixel
  const track = (name, params = {}) => {
    const { fb, ...gaParams } = params;
    ga('event', name, gaParams);
    if (fb === false) return;
    if (fb && fb.std) return fbStd(fb.std, fb.params || {}, fb.eventID);
    if (fb && fb.custom) return fbCustom(fb.custom, fb.params || {});
  };

  /* ---------- Meta attribution signals (for Conversions API dedup) ---------- */
  const getCookie = (name) => {
    const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? decodeURIComponent(m.pop()) : '';
  };
  // _fbc is set by the Pixel when ?fbclid is present; synthesize it if missing.
  const getFbc = () => {
    const existing = getCookie('_fbc');
    if (existing) return existing;
    const fbclid = new URLSearchParams(location.search).get('fbclid');
    return fbclid ? `fb.1.${Date.now()}.${fbclid}` : '';
  };
  const newEventId = () =>
    window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : 'ev-' + Date.now() + '-' + Math.random().toString(16).slice(2);

  /* ---------- CTA click tracking (botões primários + links pro #form) ---------- */
  document.querySelectorAll('.fihan-btn--primary, a[href="#form"]').forEach((el) => {
    el.addEventListener('click', () => {
      const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
      const ctaLocation = el.closest('section, header, .announce')?.id || el.closest('section, header, .announce')?.className?.split(' ')[0] || 'unknown';
      track('cta_click', {
        cta_text: text,
        cta_href: el.getAttribute('href') || '',
        cta_location: ctaLocation,
        fb: { custom: 'CTAClick', params: { cta_text: text, cta_location: ctaLocation } },
      });
    });
  });

  /* ---------- Scroll depth (25/50/75/90) ---------- */
  const scrollFired = new Set();
  const onScroll = () => {
    const doc = document.documentElement;
    const pct = Math.round(((doc.scrollTop + window.innerHeight) / doc.scrollHeight) * 100);
    [25, 50, 75, 90].forEach((m) => {
      if (pct >= m && !scrollFired.has(m)) {
        scrollFired.add(m);
        track('scroll_depth', { percent: m, fb: { custom: 'ScrollDepth', params: { percent: m } } });
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Theme toggle (dark / light) ---------- */
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('fihan-theme', next); } catch (e) {}
    });
  }

  /* ---------- Inject arrow SVG into [data-arrow] slots ---------- */
  const arrowTpl = document.getElementById('arrow-tpl');
  if (arrowTpl) {
    document.querySelectorAll('[data-arrow]').forEach((slot) => {
      slot.appendChild(arrowTpl.content.cloneNode(true));
    });
  }

  /* ---------- Mobile menu toggle ---------- */
  const menuToggle = document.getElementById('menuToggle');
  const nav = document.querySelector('.nav');
  if (menuToggle && nav) {
    menuToggle.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      menuToggle.classList.toggle('is-open', isOpen);
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        menuToggle.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
      })
    );
  }

  /* ---------- Smooth scroll offset for sticky header ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (id === '#' || id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const headerOffset = 76;
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  /* ---------- WhatsApp mask (BR) ---------- */
  const phoneInput = document.getElementById('whatsapp');
  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
      if (v.length > 10) {
        v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
      } else if (v.length > 6) {
        v = v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
      } else if (v.length > 2) {
        v = v.replace(/^(\d{2})(\d{0,5}).*/, '($1) $2');
      } else if (v.length > 0) {
        v = v.replace(/^(\d{0,2})/, '($1');
      }
      e.target.value = v;
    });
  }

  /* ---------- Multi-step form ---------- */
  const form = document.getElementById('projectForm');
  if (!form) return;

  const steps = form.querySelectorAll('.form__step');
  const dots = form.querySelectorAll('.form__step-dot');
  const stepCurrent = document.getElementById('stepCurrent');
  const successPanel = form.querySelector('.form__success');

  const goToStep = (n) => {
    steps.forEach((s) => s.classList.toggle('is-active', Number(s.dataset.step) === n));
    dots.forEach((d) => {
      const num = Number(d.dataset.step);
      d.classList.toggle('is-active', num === n);
      d.classList.toggle('is-done', num < n);
    });
    if (stepCurrent) stepCurrent.textContent = String(n);
    // Focus first input of the new step
    const active = form.querySelector('.form__step.is-active');
    if (active) {
      const firstInput = active.querySelector('input, textarea, select');
      if (firstInput) setTimeout(() => firstInput.focus(), 350);
    }
    // Smooth scroll to keep form visible
    const rect = form.getBoundingClientRect();
    if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
      window.scrollTo({
        top: window.pageYOffset + rect.top - 100,
        behavior: 'smooth',
      });
    }
  };

  // Toggle the "Aviso" (error) state on a single field + its message
  const setFieldError = (input, message) => {
    const wrap = input.closest('.fihan-input');
    const msgEl = wrap?.querySelector('.fihan-input__error');
    if (message) {
      input.classList.add('is-invalid');
      input.setAttribute('aria-invalid', 'true');
      if (msgEl) msgEl.textContent = message;
    } else {
      input.classList.remove('is-invalid');
      input.removeAttribute('aria-invalid');
    }
  };

  // Pick the error copy from the field's validity reason
  const errorMessageFor = (input) => {
    if (input.validity.valueMissing) return 'campo obrigatório *';
    if (input.validity.typeMismatch) {
      return input.type === 'email' ? 'email inválido *' : 'formato inválido *';
    }
    return 'campo obrigatório *';
  };

  const validateStep = (n) => {
    const step = form.querySelector(`.form__step[data-step="${n}"]`);
    if (!step) return false;

    const inputs = step.querySelectorAll('input, textarea, select');
    let ok = true;
    let firstInvalid = null;

    inputs.forEach((input) => {
      // Skip non-required radios/checkboxes if not the "required" trigger
      if (!input.checkValidity()) {
        ok = false;
        if (!firstInvalid) firstInvalid = input;
        setFieldError(input, errorMessageFor(input));
      } else {
        setFieldError(input, null);
      }
    });

    // Special case: radio groups (one of group must be checked)
    const radioGroups = new Set();
    step.querySelectorAll('input[type="radio"][required]').forEach((r) => radioGroups.add(r.name));
    radioGroups.forEach((name) => {
      const checked = step.querySelector(`input[type="radio"][name="${name}"]:checked`);
      if (!checked) {
        ok = false;
        if (!firstInvalid) firstInvalid = step.querySelector(`input[type="radio"][name="${name}"]`);
      }
    });

    if (!ok && firstInvalid) {
      firstInvalid.focus();
      // Subtle shake
      firstInvalid.closest('.field, .chips')?.animate(
        [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-6px)' },
          { transform: 'translateX(6px)' },
          { transform: 'translateX(-3px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 320, easing: 'ease-in-out' }
      );
    }

    return ok;
  };

  // Live-clear the "Aviso" state once an invalid field becomes valid
  form.querySelectorAll('.fihan-input__field').forEach((input) => {
    const clearIfValid = () => {
      if (input.classList.contains('is-invalid') && input.checkValidity()) {
        setFieldError(input, null);
      }
    };
    input.addEventListener('input', clearIfValid);
    input.addEventListener('change', clearIfValid);
  });

  // form_start — dispara no primeiro foco em qualquer campo do form
  let formStarted = false;
  form.addEventListener('focusin', () => {
    if (formStarted) return;
    formStarted = true;
    track('form_start', { form_id: 'projectForm', fb: { custom: 'FormStart', params: { form_id: 'projectForm' } } });
  });

  // Next/prev buttons
  form.querySelectorAll('[data-next]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = Number(btn.closest('.form__step').dataset.step);
      if (!validateStep(current)) return;
      const next = Number(btn.dataset.next);
      track('form_step_complete', { step_from: current, step_to: next, fb: { custom: 'FormStepComplete', params: { step_from: current, step_to: next } } });
      goToStep(next);
    });
  });

  form.querySelectorAll('[data-prev]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prev = Number(btn.dataset.prev);
      goToStep(prev);
    });
  });

  // Submit — tenta Resend (via /api/submit). Fallback: Formsubmit direto do navegador.
  const STAGE_LABEL = { ideia: 'Tenho a ideia', validando: 'Validando', mvp: 'Tenho MVP', operando: 'Já opero', reposicionar: 'Reposicionar' };
  const AXIS_LABEL  = { negocio: 'Negócio', marca: 'Marca', dev: 'Desenvolvimento', completo: 'Protocolo completo' };
  const BUDGET_LABEL = { ate30: 'Até R$30K', '30-80': 'R$30K – R$80K', '80-150': 'R$80K – R$150K', '150+': 'R$150K+', conversar: 'Quero conversar' };
  const URGENCY_LABEL = { agora: 'Já — precisa começar este mês', '60': 'Próximos 60 dias', '90': 'Próximos 90 dias', aberto: 'Sem prazo definido' };
  const TEAM_EMAIL = 'wellington@fihan.com.br';
  const TEAM_CC    = 'robert@fihan.com.br';

  const errorEl = document.getElementById('formError');
  const showError = (msg) => {
    if (!errorEl) return;
    errorEl.textContent = msg;
    errorEl.classList.add('is-active');
  };
  const hideError = () => {
    if (!errorEl) return;
    errorEl.classList.remove('is-active');
  };

  const generateProtocolId = () =>
    'FH-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 8999));

  const sendViaApi = async (data) => {
    const r = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok || !out.ok) throw new Error(out.error || `API ${r.status}`);
    return out;
  };

  const sendViaFormsubmit = async (data, protocolId) => {
    const axisStr = Array.isArray(data.axis) && data.axis.length
      ? data.axis.map((a) => AXIS_LABEL[a] || a).join(', ')
      : '—';

    const body = {
      Nome: data.name,
      'E-mail': data.email,
      WhatsApp: data.whatsapp,
      'Empresa/Projeto': data.company,
      'Estágio': STAGE_LABEL[data.stage] || data.stage,
      'Eixos de interesse': axisStr,
      'Investimento': BUDGET_LABEL[data.budget] || data.budget,
      'Urgência': URGENCY_LABEL[data.urgency] || data.urgency,
      'Descrição': data.description,
      'Protocolo': protocolId,
      _subject: `[Fihan] Novo projeto · ${data.company || data.name} · ${protocolId}`,
      _replyto: data.email,
      _cc: TEAM_CC,
      _template: 'table',
      _captcha: 'false',
    };

    const r = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(TEAM_EMAIL)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
    });
    const out = await r.json().catch(() => ({}));
    const ok = r.ok && (out.success === true || String(out.success).toLowerCase() === 'true');
    if (!ok) {
      const msg = String(out.message || '');
      const needsActivation = /activation/i.test(msg);
      const err = new Error(msg || `Formsubmit ${r.status}`);
      err.needsActivation = needsActivation;
      throw err;
    }
    return { ok: true, protocolId };
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    hideError();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Enviando...';
    }

    const data = Object.fromEntries(new FormData(form).entries());
    data.axis = Array.from(form.querySelectorAll('input[name="axis"]:checked')).map((i) => i.value);
    const protocolId = generateProtocolId();

    // Shared event_id + Meta signals so the server Conversions API can dedupe
    // this exact Lead with the browser Pixel event fired below.
    const leadEventId = newEventId();
    data.meta = { eventId: leadEventId, fbp: getCookie('_fbp'), fbc: getFbc(), sourceUrl: location.href };

    let out = null;
    let lastErr = null;

    // 1) Tenta /api/submit (Resend, se configurado)
    try {
      out = await sendViaApi(data);
    } catch (err) {
      lastErr = err;
      console.warn('[FIHAN] /api/submit falhou, indo pro Formsubmit:', err.message);
      // 2) Fallback: Formsubmit direto do navegador
      try {
        out = await sendViaFormsubmit(data, protocolId);
      } catch (err2) {
        lastErr = err2;
        console.error('[FIHAN] formsubmit falhou:', err2.message);
      }
    }

    if (out && out.ok) {
      const finalProtocolId = out.protocolId || protocolId;

      // Enhanced Conversions — Google hasheia (SHA-256) client-side antes de enviar
      const phoneDigits = (data.whatsapp || '').replace(/\D/g, '');
      const phoneE164 = phoneDigits ? `+55${phoneDigits}` : undefined;
      const nameParts = (data.name || '').trim().split(/\s+/);
      const firstName = nameParts.shift() || '';
      const lastName = nameParts.join(' ');

      ga('set', 'user_data', {
        email: (data.email || '').trim().toLowerCase(),
        phone_number: phoneE164,
        address: {
          first_name: firstName,
          last_name: lastName,
          country: 'BR',
        },
      });

      // Meta — Advanced Matching: melhora a atribuição do lead à pessoa que
      // veio do Meta. O fbevents.js hasheia (SHA-256) antes de enviar.
      if (typeof window.fbq === 'function') {
        window.fbq('init', META_PIXEL_ID, {
          em: (data.email || '').trim().toLowerCase(),
          ph: phoneE164,
          fn: firstName.toLowerCase(),
          ln: lastName.toLowerCase(),
          country: 'br',
        });
      }

      // GA4 — evento recomendado (marque como conversão no GA4 depois) +
      // Meta Pixel — evento padrão "Lead" (a conversão de fundo de funil).
      track('generate_lead', {
        currency: 'BRL',
        value: 500,
        transaction_id: finalProtocolId,
        lead_stage: data.stage,
        lead_budget: data.budget,
        lead_urgency: data.urgency,
        lead_axis: Array.isArray(data.axis) ? data.axis.join(',') : '',
        fb: {
          std: 'Lead',
          eventID: leadEventId,
          params: {
            value: 500,
            currency: 'BRL',
            content_name: 'Protocolo Fihan',
            content_category: 'Inscrição',
            lead_stage: data.stage,
            lead_budget: data.budget,
          },
        },
      });

      // Google Ads — conversão (substitua CONVERSION_LABEL no topo do arquivo)
      ga('event', 'conversion', {
        send_to: GA_ADS_LEAD_SEND_TO,
        value: 500,
        currency: 'BRL',
        transaction_id: finalProtocolId,
      });

      steps.forEach((s) => s.classList.remove('is-active'));
      form.querySelector('.form__head').style.display = 'none';
      successPanel.classList.add('is-active');
      const idEl = document.getElementById('successId');
      if (idEl) idEl.textContent = finalProtocolId;
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.error('[FIHAN] submit failed', lastErr);
      track('lead_submit_error', {
        error_message: String(lastErr?.message || 'unknown').slice(0, 140),
        needs_activation: Boolean(lastErr?.needsActivation),
        fb: false,
      });
      const msg = lastErr?.needsActivation
        ? 'Estamos finalizando a configuração do envio. Por favor, nos contate diretamente pelo WhatsApp +55 (27) 99728-9739 ou pelo email wellington@fihan.com.br.'
        : 'Não conseguimos enviar agora. Tente novamente em alguns segundos ou nos chame no WhatsApp: +55 (27) 99728-9739.';
      showError(msg);
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    }
  });

  /* ---------- Scroll reveal (light, no library) ---------- */
  if ('IntersectionObserver' in window) {
    const revealEls = document.querySelectorAll(
      '.grid__item, .eixo, .timeline__step, .transform__col, .faq__item, .case-card'
    );
    revealEls.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(16px)';
      el.style.transition = 'opacity .6s ease-out, transform .6s ease-out';
    });
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const delay = (i % 4) * 60;
            setTimeout(() => {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
            }, delay);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---------- Active nav highlight on scroll ---------- */
  const sections = ['problema', 'protocolo', 'eixos', 'processo', 'manifesto', 'faq']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  const navLinks = document.querySelectorAll('.nav a[href^="#"]');
  if (sections.length && 'IntersectionObserver' in window) {
    const navIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            navLinks.forEach((a) => {
              a.classList.toggle(
                'is-active',
                a.getAttribute('href') === '#' + entry.target.id
              );
            });
          }
        });
      },
      { rootMargin: '-40% 0px -55% 0px' }
    );
    sections.forEach((s) => navIO.observe(s));
  }
})();
