/* Fihan — Parceria: as cinco perguntas de qualificação.
   As respostas seguem para o CRM pelo /api/submit-lead, no campo de mensagem,
   marcadas como parceria para não se confundirem com os leads de founders. */
(function () {
  'use strict';

  var form = document.getElementById('pc-ficha');
  if (!form) return;

  var erro = form.querySelector('.intake__erro');
  var ok = form.querySelector('.pc-ficha__ok');
  var btn = form.querySelector('button[type="submit"]');
  var label = btn.querySelector('[data-btn-label]');

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

  function escolhas(name) {
    return Array.prototype.map.call(
      form.querySelectorAll('[data-group="' + name + '"] .is-selected'),
      function (c) { return c.textContent.trim(); }
    ).join(', ');
  }
  function campo(id) { return document.getElementById(id).value.trim(); }
  function mostrarErro(msg) {
    erro.textContent = msg;
    erro.classList.toggle('is-visible', !!msg);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var nome = campo('pc-nome'), email = campo('pc-email'), whats = campo('pc-whatsapp');
    if (nome.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || whats.replace(/\D/g, '').length < 8) {
      return mostrarErro('Preencha nome, e-mail e WhatsApp válidos para enviar.');
    }
    mostrarErro('');
    btn.disabled = true;
    label.textContent = 'Enviando…';

    fetch('/api/submit-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: nome,
        email: email,
        whatsapp: whats,
        empresa: 'Parceria · escritor de projetos de edital',
        mensagem: [
          '[Parceria] Perguntas de qualificação',
          '1. Instrumentos em que escreve: ' + (escolhas('instrumentos') || 'não informado'),
          '2. Projetos submetidos nos últimos doze meses: ' + (escolhas('volume') || 'não informado'),
          '3. Quem constrói a solução hoje: ' + (escolhas('construcao') || 'não informado'),
          '4. O que mais precisa de um parceiro de desenvolvimento: ' + (campo('pc-necessidade') || 'não informado')
        ].join('\n')
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        btn.hidden = true;
        ok.hidden = false;
      })
      .catch(function () {
        btn.disabled = false;
        label.textContent = 'Enviar respostas';
        mostrarErro('Não foi possível enviar agora. Tente de novo ou fale com a gente pelo WhatsApp.');
      });
  });
})();
