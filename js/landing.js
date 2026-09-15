(function () {
  'use strict';

  /* ---- Smooth scroll for [data-scroll-to] ---- */
  document.querySelectorAll('[data-scroll-to]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* =========================================================
     Navbar — menu mobile
     ========================================================= */
  var navToggle = document.getElementById('navbar-toggle');
  var navMenu = document.getElementById('navbar-menu');
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      var open = navMenu.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        navMenu.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* =========================================================
     Carrossel genérico (track com scroll-snap + dots + setas)
     ========================================================= */
  function setupCarousel(key, trackId, dotsId) {
    var track = document.getElementById(trackId);
    if (!track) return;
    var slides = track.children;
    var count = slides.length;
    var dotsEl = dotsId ? document.getElementById(dotsId) : null;
    var dots = [];

    if (dotsEl) {
      dotsEl.innerHTML = '';
      for (var i = 0; i < count; i++) {
        var dot = document.createElement('span');
        if (i === 0) dot.classList.add('is-active');
        (function (idx) {
          dot.addEventListener('click', function () { goTo(idx); });
        })(i);
        dotsEl.appendChild(dot);
        dots.push(dot);
      }
    }

    function currentIndex() {
      var w = track.clientWidth || 1;
      return Math.round(track.scrollLeft / w);
    }
    function goTo(i) {
      var idx = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
    }
    function updateDots() {
      var idx = currentIndex();
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === idx); });
    }
    track.addEventListener('scroll', function () {
      window.requestAnimationFrame(updateDots);
    }, { passive: true });

    document.querySelectorAll('[data-carousel-prev="' + key + '"]').forEach(function (btn) {
      btn.addEventListener('click', function () { goTo(currentIndex() - 1); });
    });
    document.querySelectorAll('[data-carousel-next="' + key + '"]').forEach(function (btn) {
      btn.addEventListener('click', function () { goTo(currentIndex() + 1); });
    });
  }
  setupCarousel('zei', 'zei-track', 'zei-dots');
  setupCarousel('quemsomos', 'quemsomos-track', 'quemsomos-dots');

  /* =========================================================
     "Onde você está agora?" — pills + cápsulas + setas
     ========================================================= */
  var paraquemPills = document.getElementById('paraquem-pills');
  var paraquemCopy = document.getElementById('paraquem-copy');
  var paraquemStage = document.getElementById('paraquem-stage');
  if (paraquemPills && paraquemCopy) {
    var pillButtons = Array.prototype.slice.call(paraquemPills.querySelectorAll('button'));
    var slides = Array.prototype.slice.call(paraquemCopy.querySelectorAll('.paraquem__slide'));
    // As 3 cápsulas (Fomento/alerta, Marca/marca, Dev/dev) são fixas em
    // posição e cor — cada pílula só decide qual das três fica em destaque.
    var capsules = paraquemStage ? Array.prototype.slice.call(paraquemStage.querySelectorAll('.paraquem__capsule')) : [];

    function setSlide(i) {
      var len = pillButtons.length;
      var idx = ((i % len) + len) % len;
      var bucket = pillButtons[idx].dataset.variant;
      pillButtons.forEach(function (btn, n) { btn.classList.toggle('is-active', n === idx); });
      slides.forEach(function (s) { s.classList.toggle('is-active', Number(s.dataset.copy) === idx); });
      capsules.forEach(function (c) { c.classList.toggle('paraquem__capsule--active', c.dataset.bucket === bucket); });
    }
    pillButtons.forEach(function (btn, i) {
      btn.addEventListener('click', function () { setSlide(i); });
    });
    function activeIndex() {
      var found = 0;
      pillButtons.forEach(function (btn, i) { if (btn.classList.contains('is-active')) found = i; });
      return found;
    }
    var prevBtn = document.getElementById('paraquem-prev');
    var nextBtn = document.getElementById('paraquem-next');
    if (prevBtn) prevBtn.addEventListener('click', function () { setSlide(activeIndex() - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { setSlide(activeIndex() + 1); });
  }

  /* =========================================================
     Formulário de contato (Fecho) — /api/context-lead
     ========================================================= */
  var form = document.getElementById('intake-form');
  if (form) {
    var submitBtn = document.getElementById('intake-submit');
    var errorEl = document.getElementById('intake-error');
    var confirmEl = document.getElementById('intake-confirm');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function showError(msg) {
      if (!errorEl) return;
      errorEl.textContent = msg;
      errorEl.classList.toggle('is-visible', !!msg);
    }
    function setLoading(loading) {
      if (!submitBtn) return;
      submitBtn.disabled = loading;
      var label = submitBtn.querySelector('[data-btn-label]');
      if (label) label.textContent = loading ? 'ENVIANDO…' : 'ENVIAR';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.website && form.website.value) return; // honeypot

      var name = form.nome.value.trim();
      var email = form.email.value.trim();
      var whatsapp = form.whatsapp.value.trim();
      var businessName = form.empresa.value.trim();
      var stage = form.estagio.value;
      var eixosSelecionados = Array.prototype.slice.call(form.eixos.selectedOptions).map(function (o) { return o.value; });
      var investimento = form.investimento.options[form.investimento.selectedIndex];
      var urgencia = form.urgencia.options[form.urgencia.selectedIndex];
      var mensagem = form.mensagem.value.trim();

      if (name.length < 2 || !emailRe.test(email) || whatsapp.replace(/\D/g, '').length < 8) {
        showError('Preencha nome, e-mail e WhatsApp válidos para continuar.');
        return;
      }
      showError('');

      var decisionParts = [];
      if (investimento && investimento.value) decisionParts.push('Investimento: ' + investimento.text);
      if (urgencia && urgencia.value) decisionParts.push('Urgência: ' + urgencia.text);
      if (mensagem) decisionParts.push('', mensagem);
      var decisionText = decisionParts.join('\n');

      setLoading(true);
      fetch('/api/context-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name,
          email: email,
          whatsapp: whatsapp,
          businessName: businessName,
          stage: stage || null,
          eixo: eixosSelecionados.join('+') || null,
          decisionText: decisionText
        })
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          setLoading(false);
          if (!res.ok || !res.body.protocolId) {
            showError(res.body.error || 'Não foi possível enviar seus dados agora. Tente novamente.');
            return;
          }
          if (typeof window.fbq === 'function') {
            window.fbq('track', 'Lead', { content_name: 'Contato Home Fihan', stage: stage, eixo: eixosSelecionados.join('+') });
          }
          document.getElementById('intake-protocol').textContent = res.body.protocolId;
          form.hidden = true;
          if (confirmEl) {
            confirmEl.hidden = false;
            confirmEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        })
        .catch(function () {
          setLoading(false);
          showError('Falha de conexão. Verifique sua internet e tente novamente.');
        });
    });
  }
})();
