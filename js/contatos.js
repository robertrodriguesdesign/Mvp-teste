/* Fihan — Contatos: formulário de contexto em três passos.
   Envia para o CRM pelo mesmo endpoint e com os mesmos campos do formulário
   da home (/api/submit-lead). */
(function () {
  'use strict';

  var form = document.getElementById('intake');
  if (!form) return;

  var panels = form.querySelectorAll('.intake__panel');
  var dots = form.querySelectorAll('.intake__pontos span');
  var stepLabel = form.querySelector('[data-passo-label]');
  var submitBtn = form.querySelector('button[type="submit"]');

  function goToStep(step) {
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.step === String(step)); });
    dots.forEach(function (d, i) { d.classList.toggle('is-on', i < step); });
    stepLabel.textContent = step > 3 ? 'enviado' : 'passo ' + step + '/3';
    var target = form.querySelector('.intake__panel.is-active').querySelector('input, select, textarea, .intake__chip, .intake__ok');
    if (target) target.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showError(step, msg) {
    var el = form.querySelector('[data-erro="' + step + '"]');
    el.textContent = msg;
    el.classList.toggle('is-visible', !!msg);
  }
  function campo(id) { return document.getElementById(id).value.trim(); }
  function escolhas(group) {
    return Array.prototype.map.call(
      form.querySelectorAll('[data-group="' + group + '"] .is-selected'),
      function (c) { return c.textContent.trim(); }
    );
  }

  form.querySelectorAll('.intake__chips').forEach(function (group) {
    var multi = group.hasAttribute('data-multi');
    group.addEventListener('click', function (e) {
      var chip = e.target.closest('.intake__chip');
      if (!chip) return;
      group.querySelectorAll('.intake__chip').forEach(function (c) {
        var on = multi ? (c === chip ? !c.classList.contains('is-selected') : c.classList.contains('is-selected')) : c === chip;
        c.classList.toggle('is-selected', on);
        c.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  function validar(step) {
    if (step === 1 && (campo('ct-nome').length < 2 || !emailRe.test(campo('ct-email')) || campo('ct-whatsapp').replace(/\D/g, '').length < 8)) {
      return 'Preencha nome, e-mail e WhatsApp válidos para continuar.';
    }
    if (step === 2 && !escolhas('estagio').length) return 'Selecione o estágio do seu projeto.';
    if (step === 2 && !escolhas('eixos').length) return 'Selecione ao menos um Eixo de interesse.';
    return '';
  }

  form.querySelectorAll('[data-avancar]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var step = Number(btn.dataset.avancar);
      var erro = validar(step);
      showError(step, erro);
      if (!erro) goToStep(step + 1);
    });
  });
  // Enter em um campo dos passos 1 e 2 avança, em vez de enviar o formulário.
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT') return;
    var step = Number(e.target.closest('.intake__panel').dataset.step);
    if (step < 3) { e.preventDefault(); form.querySelector('[data-avancar="' + step + '"]').click(); }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var erro = validar(1) || validar(2);
    if (erro) return showError(3, erro);
    showError(3, '');

    var label = submitBtn.querySelector('[data-btn-label]');
    submitBtn.disabled = true;
    label.textContent = 'Enviando…';

    fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: campo('ct-nome'),
        email: campo('ct-email'),
        whatsapp: campo('ct-whatsapp'),
        empresa: campo('ct-empresa'),
        estagio: escolhas('estagio')[0] || '',
        eixos: escolhas('eixos'),
        investimento: campo('ct-investimento'),
        urgencia: campo('ct-urgencia'),
        mensagem: campo('ct-mensagem')
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        goToStep(4);
      })
      .catch(function () {
        submitBtn.disabled = false;
        label.textContent = 'Enviar';
        showError(3, 'Não foi possível enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.');
      });
  });
})();
