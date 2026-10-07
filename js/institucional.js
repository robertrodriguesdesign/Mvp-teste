/* Fihan — Páginas institucionais: menu/busca e campo de contato. */
(function () {
  'use strict';

  var WHATSAPP = '5527997289739';
  var EMAIL = 'contato@fihan.com.br';

  /* ───── Menu e busca ───── */
  var menu = document.getElementById('inst-menu');
  if (menu && typeof menu.showModal === 'function') {
    var search = menu.querySelector('.inst-menu__search');
    var links = Array.prototype.slice.call(menu.querySelectorAll('.inst-menu__list a'));
    var empty = menu.querySelector('.inst-menu__empty');

    var normalize = function (s) {
      return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    };

    var filter = function () {
      var q = normalize(search.value.trim());
      var visible = 0;
      links.forEach(function (a) {
        var match = !q || normalize(a.textContent + ' ' + (a.dataset.keywords || '')).indexOf(q) !== -1;
        a.parentElement.hidden = !match;
        if (match) visible++;
      });
      menu.querySelectorAll('.inst-menu__col').forEach(function (col) {
        col.hidden = !col.querySelector('li:not([hidden])');
      });
      empty.style.display = visible ? 'none' : 'block';
    };

    document.querySelectorAll('[data-open-menu]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        search.value = '';
        filter();
        menu.showModal();
        if (btn.dataset.openMenu === 'busca') search.focus();
        else menu.querySelector('[data-close-menu]').focus();
      });
    });
    menu.querySelector('[data-close-menu]').addEventListener('click', function () { menu.close(); });
    search.addEventListener('input', filter);
    search.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter') return;
      var first = links.filter(function (a) { return !a.parentElement.hidden; })[0];
      if (first) window.location.href = first.href;
    });
  }

  /* ───── Campo de contato ─────
     Os ladrilhos já são links válidos sem JS; aqui a mensagem digitada
     entra no texto do WhatsApp e no corpo do e-mail. */
  document.querySelectorAll('[data-contato]').forEach(function (campo) {
    var input = campo.querySelector('input');
    var wa = campo.querySelector('[data-contato-whatsapp]');
    var mail = campo.querySelector('[data-contato-email]');
    var sync = function () {
      var msg = input.value.trim();
      wa.href = 'https://wa.me/' + WHATSAPP + (msg ? '?text=' + encodeURIComponent(msg) : '');
      mail.href = 'mailto:' + EMAIL + (msg ? '?body=' + encodeURIComponent(msg) : '');
    };
    input.addEventListener('input', sync);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && input.value.trim()) {
        sync();
        window.open(wa.href, '_blank', 'noopener');
      }
    });
  });
})();
