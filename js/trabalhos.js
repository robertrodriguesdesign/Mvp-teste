/* Fihan — Trabalhos: acrescenta ao índice os projetos publicados pelo admin.
   Os seis cards fixos continuam no HTML; os novos entram antes deles. */
(function () {
  'use strict';

  var grid = document.querySelector('#indice .case-grid');
  if (!grid || !window.fetch) return;

  // só endereços do próprio site ou http(s) viram src de imagem
  function urlSegura(url) {
    return /^(https?:\/\/|\/(?!\/))/i.test(url || '') ? url : '';
  }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  fetch('/api/site?lista=projeto')
    .then(function (res) { return res.ok ? res.json() : { conteudos: [] }; })
    .then(function (data) {
      var frag = document.createDocumentFragment();
      (data.conteudos || []).forEach(function (c) {
        var card = el('a', 'case-card');
        card.href = '/trabalhos/' + encodeURIComponent(c.slug);

        var image = el('div', 'case-card__image');
        var capa = urlSegura(c.capa);
        if (capa) {
          var img = el('img');
          img.src = capa;
          img.alt = '';
          img.loading = 'lazy';
          image.appendChild(img);
        }

        var body = el('div', 'case-card__body');
        body.appendChild(el('p', 't-overline', '[ ' + c.titulo + ' ]'));
        body.appendChild(el('h2', 't-h3', c.titulo));
        body.appendChild(el('p', 't-body', c.resumo));

        card.appendChild(image);
        card.appendChild(body);
        frag.appendChild(card);
      });
      grid.insertBefore(frag, grid.firstChild);
    })
    .catch(function () { /* sem os projetos novos, o índice fixo continua valendo */ });
})();
