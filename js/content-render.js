/* ================================================================
   FIHAN — content-render.js
   Utilitários compartilhados por Trabalhos/case, Blog/index e
   Blog/post: fetch de /api/content e um conversor markdown→HTML
   minimalista (não é CommonMark completo, cobre o essencial do
   corpo escrito no painel de Conteúdo).
   ================================================================ */

window.FihanContent = (function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Markdown minimalista: escapa tudo primeiro (nunca injeta HTML cru do
  // banco), depois aplica um subconjunto pequeno de sintaxe.
  function markdownToHtml(raw) {
    var text = esc(String(raw || '').trim());
    if (!text) return '';

    var blocks = text.split(/\n\s*\n/);
    var html = blocks.map(function (block) {
      var line = block.trim();
      if (!line) return '';

      var h = line.match(/^(#{2,3})\s+(.*)$/);
      if (h) {
        var tag = h[1].length === 2 ? 'h2' : 'h3';
        return '<' + tag + '>' + inline(h[2]) + '</' + tag + '>';
      }
      return '<p>' + inline(line).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');

    return html;
  }

  function inline(s) {
    return s
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  function fetchBySlug(slug) {
    return fetch('/api/content?slug=' + encodeURIComponent(slug))
      .then(function (r) {
        if (!r.ok) throw new Error(r.status === 404 ? 'not_found' : 'fetch_error');
        return r.json();
      })
      .then(function (data) { return data.item; });
  }

  function fetchList(type) {
    var qs = type ? ('?type=' + encodeURIComponent(type) + '&status=published') : '?status=published';
    return fetch('/api/content' + qs)
      .then(function (r) {
        if (!r.ok) throw new Error('fetch_error');
        return r.json();
      })
      .then(function (data) { return data.items || []; });
  }

  var KIND_LABEL = { photo: 'Foto', video: 'Vídeo', link: 'Link' };

  function renderAttachments(attachments) {
    if (!attachments || !attachments.length) return '';
    var items = attachments.map(function (a) {
      if (a.kind === 'photo') {
        return '<figure class="inst-attach inst-attach--photo">' +
          '<img src="' + esc(a.url) + '" alt="' + esc(a.caption || '') + '" loading="lazy" />' +
          (a.caption ? '<figcaption>' + esc(a.caption) + '</figcaption>' : '') +
          '</figure>';
      }
      if (a.kind === 'video') {
        return '<figure class="inst-attach inst-attach--video">' +
          '<video src="' + esc(a.url) + '" controls preload="metadata"></video>' +
          (a.caption ? '<figcaption>' + esc(a.caption) + '</figcaption>' : '') +
          '</figure>';
      }
      return '<a class="inst-attach inst-attach--link" href="' + esc(a.url) + '" target="_blank" rel="noopener">' +
        esc(a.caption || a.url) + ' ↗</a>';
    });
    return '<div class="inst-attach-grid">' + items.join('') + '</div>';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'long', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function setMeta(title, description) {
    if (title) document.title = title;
    if (description) {
      var m = document.querySelector('meta[name="description"]');
      if (m) m.setAttribute('content', description);
      var og = document.querySelector('meta[property="og:description"]');
      if (og) og.setAttribute('content', description);
    }
    var ogt = document.querySelector('meta[property="og:title"]');
    if (ogt && title) ogt.setAttribute('content', title);
  }

  return {
    esc: esc,
    markdownToHtml: markdownToHtml,
    fetchBySlug: fetchBySlug,
    fetchList: fetchList,
    renderAttachments: renderAttachments,
    fmtDate: fmtDate,
    setMeta: setMeta,
    KIND_LABEL: KIND_LABEL,
  };
})();
