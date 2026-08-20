/* ================================================================
   FIHAN — institucional.js
   Menu drawer, accordion de eixos, formulário de contexto (Contatos)
   ================================================================ */

(function () {
  'use strict';

  /* ---------- Navbar (mega-menu) ---------- */
  var navbar = document.getElementById('siteNavbar');
  var navToggle = document.getElementById('navToggle');
  var navToggleIcon = document.getElementById('navToggleIcon');
  var navPanel = document.getElementById('navPanel');

  function openNav() {
    if (!navbar) return;
    navbar.classList.add('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    if (navToggleIcon) navToggleIcon.src = '/components/icon/icon-close.svg';
    loadNavBlogCards();
  }
  function closeNav() {
    if (!navbar) return;
    navbar.classList.remove('is-open');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    if (navToggleIcon) navToggleIcon.src = '/components/icon/icon-hamburger.svg';
  }
  function toggleNav() {
    if (!navbar) return;
    if (navbar.classList.contains('is-open')) closeNav(); else openNav();
  }
  if (navToggle) navToggle.addEventListener('click', toggleNav);
  if (navPanel) {
    navPanel.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  /* ---------- Alternador de tema (claro/escuro) ---------- */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('fihan-theme', next); } catch (e) {}
    });
  }

  /* ---------- Posts recentes do Blog no menu aberto ---------- */
  var navBlogLoaded = false;
  function loadNavBlogCards() {
    var container = document.getElementById('navBlogCards');
    if (!container || navBlogLoaded) return;
    navBlogLoaded = true;

    fetch('/api/content?type=artigo&status=published')
      .then(function (r) { if (!r.ok) throw new Error('fetch_error'); return r.json(); })
      .then(function (data) {
        var items = (data.items || []).slice(0, 2); // API já ordena por published_at desc — sempre os mais recentes
        if (!items.length) {
          container.innerHTML = '<span class="fihan-navbar__blog-empty">Nenhum artigo publicado ainda.</span>';
          return;
        }
        container.innerHTML = items.map(function (item) {
          var esc = function (s) {
            return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          };
          var media = item.cover_url
            ? '<img src="' + esc(item.cover_url) + '" alt="" loading="lazy" />'
            : '<span class="fihan-navbar__blog-card-media"></span>';
          return (
            '<a class="fihan-navbar__blog-card" href="/blog/post.html?slug=' + encodeURIComponent(item.slug) + '">' +
              media +
              '<p>' + esc(item.summary || item.title) + '</p>' +
            '</a>'
          );
        }).join('');
      })
      .catch(function () {
        container.innerHTML = '<span class="fihan-navbar__blog-empty">Não foi possível carregar os artigos agora.</span>';
        navBlogLoaded = false;
      });
  }

  /* ---------- Eixos accordion ---------- */
  document.querySelectorAll('.inst-eixo__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var item = btn.closest('.inst-eixo');
      var wasOpen = item.classList.contains('is-open');
      item.parentElement.querySelectorAll('.inst-eixo').forEach(function (el) {
        el.classList.remove('is-open');
        el.querySelector('.inst-eixo__btn').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Metodologia — cards em acordeão (independentes) ---------- */
  document.querySelectorAll('.inst-methodology-card__head--interactive').forEach(function (head) {
    head.addEventListener('click', function () {
      var card = head.closest('.inst-methodology-card');
      var wasOpen = card.classList.contains('is-open');
      card.classList.toggle('is-open', !wasOpen);
      head.setAttribute('aria-expanded', String(!wasOpen));
    });
  });

  /* ---------- Contact form (Contatos) ----------
     O formulário de contato virou um wizard de 3 etapas + agendador — ver
     /contatos.js (carregado só na página /contatos). O handler antigo que
     postava direto pro formsubmit.co saiu daqui: o agendador exige que o
     lead já exista no backend antes de oferecer horários, então o fluxo
     agora passa por /api/context-lead desde a etapa 3. */

  /* ---------- Scroll reveal (com stagger em grids) ---------- */
  if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; /* ease-out-expo — ritmo suave e "caro", sem overshoot */
    var DURATION = 420; /* ms */
    var STAGGER_STEP = 70; /* ms entre itens do mesmo grid/lista */
    var STAGGER_MAX = 5; /* a partir do 6º item, todos entram juntos (evita esperas longas) */

    var STAGGER_GROUPS = [
      '.inst-case-grid', '.inst-founders', '.inst-eixos', '.inst-pills',
      '.inst-deliverables__card', '.inst-methodology__grid', '.inst-founders-strip__logos',
    ];

    var revealEls = Array.prototype.slice.call(document.querySelectorAll('.inst-reveal'));

    function staggerIndex(el) {
      for (var i = 0; i < STAGGER_GROUPS.length; i++) {
        var group = el.closest(STAGGER_GROUPS[i]);
        if (group) {
          return Array.prototype.indexOf.call(group.children, el);
        }
      }
      return 0;
    }

    revealEls.forEach(function (el) {
      var delay = Math.min(staggerIndex(el), STAGGER_MAX) * STAGGER_STEP;
      el.style.opacity = '0';
      el.style.transform = 'translateY(18px)';
      el.style.transition =
        'opacity ' + DURATION + 'ms ' + EASE + ' ' + delay + 'ms, ' +
        'transform ' + DURATION + 'ms ' + EASE + ' ' + delay + 'ms';
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.inst-reveal').forEach(function (el) {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }
})();
