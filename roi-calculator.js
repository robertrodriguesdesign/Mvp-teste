/* ================================================================
   FIHAN — roi-calculator.js  (homepage only)
   Bottom-sheet "Calculadora de ROI": eixo(s) → faturamento → resultado.
   Alimenta o handoff pro wizard de /contatos via sessionStorage.
   ================================================================ */

(function () {
  'use strict';

  var modal = document.getElementById('roiModal');
  if (!modal) return;

  var inlineSlider = document.getElementById('roiInlineSlider');
  var inlineDisplay = document.getElementById('roiInlineDisplay');
  var modalSlider = document.getElementById('roiModalSlider');
  var modalDisplay = document.getElementById('roiModalDisplay');
  var eixoCards = Array.prototype.slice.call(document.querySelectorAll('#roiEixoCards .inst-choice-card'));
  var comFihanEl = document.getElementById('roiComFihan');
  var semFihanEl = document.getElementById('roiSemFihan');
  var ctaBtn = modal.querySelector('[data-roi-cta]');
  var step1Continue = modal.querySelector('[data-roi-next="2"]');

  var ROI_MULTIPLIER = 3.86; // 13500/3500 — heurística de marketing calibrada pelo exemplo do Figma, não é modelo estatístico
  var ILLUSTRATIVE_BASE = 5000; // usado só quando o visitante ainda não fatura

  var state = { eixos: [], faturamento: 3500, isPreRevenue: false };

  function formatBRL(n) {
    return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function computeRoi(faturamento, isPreRevenue) {
    var base = isPreRevenue ? ILLUSTRATIVE_BASE : faturamento;
    var semFihan = isPreRevenue ? 0 : faturamento;
    var comFihan = Math.round((base * ROI_MULTIPLIER) / 100) * 100;
    return { semFihan: semFihan, comFihan: comFihan };
  }

  /* Slider custom (168:1133): o <input type=range> fica invisível por cima
     só pra manter teclado/drag/acessibilidade — quem aparece é a barra de
     preenchimento verde, cuja largura é recalculada aqui a cada mudança. */
  function updateSliderFill(inputEl) {
    if (!inputEl) return;
    var wrapper = inputEl.closest('.inst-slider');
    var fill = wrapper && wrapper.querySelector('[data-slider-fill]');
    if (!fill) return;
    var min = Number(inputEl.min) || 0;
    var max = Number(inputEl.max) || 100;
    var pct = max > min ? ((Number(inputEl.value) - min) / (max - min)) * 100 : 0;
    fill.style.width = Math.max(0, Math.min(100, pct)) + '%';
  }

  function setFaturamento(value) {
    state.faturamento = Number(value) || 0;
    var label = formatBRL(state.faturamento);
    if (inlineDisplay) inlineDisplay.textContent = label;
    if (modalDisplay) modalDisplay.textContent = label;
    if (inlineSlider) { inlineSlider.value = state.faturamento; updateSliderFill(inlineSlider); }
    if (modalSlider) { modalSlider.value = state.faturamento; updateSliderFill(modalSlider); }
  }

  if (inlineSlider) {
    inlineSlider.addEventListener('input', function () { setFaturamento(inlineSlider.value); });
  }
  if (modalSlider) {
    modalSlider.addEventListener('input', function () { setFaturamento(modalSlider.value); });
  }

  function updateStep1ContinueState() {
    if (step1Continue) step1Continue.disabled = state.eixos.length === 0;
  }

  eixoCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var eixo = card.getAttribute('data-eixo');
      var idx = state.eixos.indexOf(eixo);
      if (idx === -1) {
        state.eixos.push(eixo);
        card.classList.add('is-selected');
      } else {
        state.eixos.splice(idx, 1);
        card.classList.remove('is-selected');
      }
      updateStep1ContinueState();
    });
  });
  updateStep1ContinueState();

  function goToStep(n) {
    modal.querySelectorAll('.inst-sheet__step').forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-step') === String(n));
    });
    modal.querySelector('.inst-sheet__panel').scrollTop = 0;
  }

  function openModal(startStep) {
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    goToStep(startStep || 1);
  }
  function closeModal() {
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  modal.querySelectorAll('[data-close-roi]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
  });

  document.querySelectorAll('[data-open-roi]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.hasAttribute('data-roi-pre-revenue')) {
        state.isPreRevenue = true;
      } else if (btn.hasAttribute('data-roi-continue')) {
        state.isPreRevenue = false;
      }
      setFaturamento(state.faturamento);
      openModal(1);
    });
  });

  if (step1Continue) {
    step1Continue.addEventListener('click', function () {
      if (state.eixos.length === 0) return;
      goToStep(2);
    });
  }

  var step2Next = modal.querySelector('[data-roi-next="3"]');
  var step2PreRevenue = modal.querySelector('[data-roi-prerevenue]');

  function renderResult() {
    var result = computeRoi(state.faturamento, state.isPreRevenue);
    if (comFihanEl) comFihanEl.textContent = formatBRL(result.comFihan);
    if (semFihanEl) semFihanEl.textContent = formatBRL(result.semFihan);
  }

  if (step2Next) {
    step2Next.addEventListener('click', function () {
      state.isPreRevenue = false;
      renderResult();
      goToStep(3);
    });
  }
  if (step2PreRevenue) {
    step2PreRevenue.addEventListener('click', function () {
      state.isPreRevenue = true;
      renderResult();
      goToStep(3);
    });
  }

  if (ctaBtn) {
    ctaBtn.addEventListener('click', function () {
      try {
        sessionStorage.setItem('fihan_wizard_prefill', JSON.stringify({
          roiEixos: state.eixos,
          roiFaturamento: state.isPreRevenue ? null : state.faturamento,
        }));
      } catch (e) { /* sessionStorage indisponível — segue sem prefill */ }
      window.location.href = '/contatos#wizard';
    });
  }

  setFaturamento(state.faturamento);

  /* ---------- Contact teaser → handoff pro wizard de /contatos ---------- */
  var teaserForm = document.getElementById('contactTeaserForm');
  if (teaserForm) {
    teaserForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Object.fromEntries(new FormData(teaserForm).entries());
      try {
        sessionStorage.setItem('fihan_wizard_prefill', JSON.stringify({
          name: data.nome || '',
          email: data.email || '',
          businessName: data.negocio || '',
          stage: data.estagio || '',
        }));
      } catch (err) { /* sessionStorage indisponível — segue sem prefill */ }
      window.location.href = '/contatos#wizard';
    });
  }
})();
