(function () {
  'use strict';

  /* =========================================================
     Estado compartilhado do funil (calc ROI → eixos → contato)
     ========================================================= */
  var formState = {
    name: '', email: '', whatsapp: '', businessName: '',
    stage: '', eixo: '', revenueRange: '',
    roiEixos: [], roiFaturamento: 0,
    protocolId: '', selectedSlot: null
  };

  var EIXO_LABEL = { negocio: 'Negócio', marca: 'Marca', dev: 'Dev' };
  // Uplift por eixo calibrado a partir do exemplo do Figma (R$3.500 → R$13.500
  // com os 3 eixos), depois arredondado. Cada eixo soma seu ganho percentual
  // ao faturamento informado no slider.
  var EIXO_UPLIFT = { negocio: 1.00, marca: 0.90, dev: 0.95 };
  var DEFAULT_UPLIFT = 0.50; // fallback se nenhum eixo estiver marcado

  function formatBRL(n) {
    return 'R$ ' + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* =========================================================
     Bottom sheets (seleção de eixos + resultado)
     ========================================================= */
  var backdrop = document.getElementById('sheet-backdrop');
  var sheets = {
    eixo: document.getElementById('eixo-sheet'),
    result: document.getElementById('result-sheet')
  };

  function closeAllSheets() {
    Object.keys(sheets).forEach(function (key) { sheets[key].classList.remove('is-open'); });
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function openSheet(name) {
    closeAllSheets();
    sheets[name].classList.add('is-open');
    backdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  document.querySelectorAll('[data-open-sheet2]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.hasAttribute('data-roi-skip')) formState.roiFaturamento = 0;
      openSheet('eixo');
    });
  });
  document.querySelectorAll('[data-close-sheet]').forEach(function (btn) {
    btn.addEventListener('click', closeAllSheets);
  });
  backdrop.addEventListener('click', closeAllSheets);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllSheets(); });

  function goToContact() {
    closeAllSheets();
    var contact = document.getElementById('contato');
    if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  document.querySelectorAll('[data-go-to-contact]').forEach(function (btn) {
    btn.addEventListener('click', goToContact);
  });

  /* ---- ROI slider ---- */
  var slider = document.getElementById('calc-slider');
  var valueEl = document.getElementById('calc-value');
  var sliderFill = document.getElementById('calc-slider-fill');
  function updateSlider() {
    formState.roiFaturamento = Number(slider.value);
    valueEl.textContent = formatBRL(slider.value);
    var pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    sliderFill.style.width = pct + '%';
  }
  if (slider) {
    slider.addEventListener('input', updateSlider);
    updateSlider();
  }

  /* ---- Eixo selection (multi-select) — sheet 2 ---- */
  document.querySelectorAll('#eixo-select-list .selectable-card').forEach(function (card) {
    card.addEventListener('click', function () {
      var selected = card.classList.toggle('is-selected');
      card.setAttribute('aria-pressed', String(selected));
      var check = card.querySelector('.selectable-card__check');
      check.src = selected
        ? 'images/icons/ui/checkbox-checked.svg'
        : 'images/icons/ui/checkbox-unchecked.svg';
    });
  });

  /* ---- Resultado dinâmico (sheet 3) ---- */
  document.querySelectorAll('[data-open-sheet3]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var selectedCards = document.querySelectorAll('#eixo-select-list .selectable-card.is-selected');
      var eixos = Array.from(selectedCards).map(function (c) { return c.dataset.eixo; });
      formState.roiEixos = eixos;

      var uplift = eixos.length
        ? eixos.reduce(function (sum, key) { return sum + (EIXO_UPLIFT[key] || 0); }, 0)
        : DEFAULT_UPLIFT;

      var semFihan = formState.roiFaturamento > 0 ? formState.roiFaturamento : 3500;
      var comFihan = semFihan * (1 + uplift);

      var label = eixos.length
        ? 'Com Fihan · ' + eixos.map(function (k) { return EIXO_LABEL[k] || k; }).join('+')
        : 'Com Fihan · Protocolo completo';

      document.getElementById('result-com-label').textContent = label;
      document.getElementById('result-com-value').textContent = formatBRL(comFihan);
      document.getElementById('result-sem-value').textContent = formatBRL(semFihan);

      openSheet('result');
    });
  });

  /* ---- Smooth scroll for [data-scroll-to] ---- */
  document.querySelectorAll('[data-scroll-to]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = document.querySelector(btn.getAttribute('data-scroll-to'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---- Card Eixo accordion (seção "Três eixos") ---- */
  document.querySelectorAll('#eixo-list .card-eixo__header').forEach(function (header) {
    header.addEventListener('click', function () {
      var card = header.closest('.card-eixo');
      var expanding = !card.classList.contains('is-expanded');
      card.classList.toggle('is-expanded');
      card.querySelector('.card-eixo__icon').src = expanding
        ? 'images/icons/ui/icon-close.svg'
        : 'images/icons/ui/icon-mais.svg';
    });
  });

  /* ---- Cases carousel arrows ---- */
  var casesRow = document.getElementById('cases-row');
  var casesPrev = document.getElementById('cases-prev');
  var casesNext = document.getElementById('cases-next');
  function scrollCases(dir) {
    if (!casesRow) return;
    var card = casesRow.querySelector('.card-case');
    var amount = card ? card.getBoundingClientRect().width + 31 : 300;
    casesRow.scrollBy({ left: dir * amount, behavior: 'smooth' });
  }
  if (casesPrev) casesPrev.addEventListener('click', function () { scrollCases(-1); });
  if (casesNext) casesNext.addEventListener('click', function () { scrollCases(1); });

  /* =========================================================
     Formulário de contato (funcional — grava lead e agenda reunião)
     ========================================================= */
  var contatoSection = document.getElementById('contato');
  var panels = contatoSection.querySelectorAll('.form-panel');
  var formCard = contatoSection.querySelector('.form-card');

  function goToStep(step) {
    panels.forEach(function (p) { p.classList.toggle('is-active', p.dataset.step === String(step)); });
    if (formCard) formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function showError(id, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('is-visible', !!msg);
  }
  function setLoading(btn, loading, loadingText) {
    var label = btn.querySelector('[data-btn-label]');
    if (loading) {
      btn.disabled = true;
      btn.dataset.originalLabel = label ? label.textContent : '';
      if (label) label.textContent = loadingText || 'Enviando…';
    } else {
      btn.disabled = false;
      if (label && btn.dataset.originalLabel) label.textContent = btn.dataset.originalLabel;
    }
  }

  /* Sincroniza o <select> do Step 1 com o grupo de chips "Estágio" do Step 2
     — ambos representam o mesmo campo (stage) e devem ficar sempre em sync. */
  var stageSelect = document.getElementById('f-stage-select');
  var stageChipGroup = contatoSection.querySelector('.fh-chips[data-sync-group="stage"]');
  function setStage(value) {
    formState.stage = value;
    if (stageSelect.value !== value) stageSelect.value = value;
    stageChipGroup.querySelectorAll('.fh-chip').forEach(function (c) {
      c.classList.toggle('is-selected', c.dataset.value === value);
    });
  }
  stageSelect.addEventListener('change', function () { setStage(stageSelect.value); });
  stageChipGroup.querySelectorAll('.fh-chip').forEach(function (chip) {
    chip.addEventListener('click', function () { setStage(chip.dataset.value); });
  });

  /* Grupos de seleção única (eixo, faturamento, horário) — clicar marca só
     aquela opção dentro do próprio grupo. */
  contatoSection.querySelectorAll('.fh-chips[data-group]').forEach(function (group) {
    group.querySelectorAll('.fh-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        group.querySelectorAll('.fh-chip').forEach(function (c) { c.classList.remove('is-selected'); });
        chip.classList.add('is-selected');
        var key = group.dataset.group;
        if (key === 'eixo') formState.eixo = chip.dataset.value;
        if (key === 'revenueRange') formState.revenueRange = chip.dataset.value;
      });
    });
  });

  /* ---- Step 1 → 2: validação client-side simples ---- */
  var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  contatoSection.querySelectorAll('[data-next]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      formState.name = document.getElementById('f-name').value.trim();
      formState.email = document.getElementById('f-email').value.trim();
      formState.whatsapp = document.getElementById('f-whatsapp').value.trim();
      formState.businessName = document.getElementById('f-business').value.trim();
      if (stageSelect.value) formState.stage = stageSelect.value;

      if (formState.name.length < 2 || !emailRe.test(formState.email) || formState.whatsapp.replace(/\D/g, '').length < 8) {
        showError('step1-error', 'Preencha nome, e-mail e WhatsApp válidos para continuar.');
        return;
      }
      showError('step1-error', '');
      setStage(formState.stage || '');
      goToStep(2);
    });
  });

  /* ---- Step 2 → 3: grava o lead via /api/context-lead ---- */
  var step2Submit = document.getElementById('step2-submit');
  step2Submit.addEventListener('click', function () {
    if (!formState.stage) return showError('step2-error', 'Selecione o estágio do seu negócio.');
    if (!formState.eixo) return showError('step2-error', 'Selecione o eixo que mais te preocupa.');
    if (!formState.revenueRange) return showError('step2-error', 'Selecione a faixa de faturamento.');
    showError('step2-error', '');

    setLoading(step2Submit, true, 'Enviando…');
    fetch('/api/context-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formState.name,
        email: formState.email,
        whatsapp: formState.whatsapp,
        businessName: formState.businessName,
        stage: formState.stage,
        eixo: formState.eixo,
        revenueRange: formState.revenueRange,
        roiEixos: formState.roiEixos,
        roiFaturamento: formState.roiFaturamento
      })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        setLoading(step2Submit, false);
        if (!res.ok || !res.body.protocolId) {
          showError('step2-error', res.body.error || 'Não foi possível enviar seus dados agora. Tente novamente.');
          return;
        }
        formState.protocolId = res.body.protocolId;
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'Lead', {
            content_name: 'Diagnóstico Fihan',
            stage: formState.stage,
            eixo: formState.eixo
          });
        }
        goToStep(3);
        loadAvailability();
      })
      .catch(function () {
        setLoading(step2Submit, false);
        showError('step2-error', 'Falha de conexão. Verifique sua internet e tente novamente.');
      });
  });

  /* ---- Step 3: disponibilidade dinâmica (/api/availability) ---- */
  var WEEKDAY_ABBR = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
  var MONTH_NAME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var dateCellsEl = document.getElementById('date-cells');
  var timeChipsEl = document.getElementById('time-chips');
  var availabilityDays = [];
  var utcOffsetMinutes = -180;

  function localParts(isoUtc) {
    var shifted = new Date(new Date(isoUtc).getTime() + utcOffsetMinutes * 60000);
    return {
      weekday: shifted.getUTCDay(),
      day: shifted.getUTCDate(),
      month: shifted.getUTCMonth(),
      year: shifted.getUTCFullYear(),
      hh: String(shifted.getUTCHours()).padStart(2, '0'),
      mm: String(shifted.getUTCMinutes()).padStart(2, '0')
    };
  }

  function renderTimeChips(day) {
    timeChipsEl.innerHTML = '';
    day.slots.forEach(function (slot, i) {
      var p = localParts(slot.startUtc);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-chip';
      btn.textContent = p.hh + ':' + p.mm;
      if (i === 0) btn.classList.add('is-selected');
      btn.addEventListener('click', function () {
        timeChipsEl.querySelectorAll('.fh-chip').forEach(function (c) { c.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        formState.selectedSlot = slot;
      });
      timeChipsEl.appendChild(btn);
    });
    formState.selectedSlot = day.slots[0] || null;
  }

  function renderDateCells() {
    dateCellsEl.innerHTML = '';
    dateCellsEl.removeAttribute('data-state');
    if (!availabilityDays.length) {
      var msg = document.createElement('p');
      msg.className = 'fh-availability-status';
      msg.textContent = 'Nenhum horário disponível nos próximos dias. Fale com a gente pelo WhatsApp.';
      dateCellsEl.appendChild(msg);
      return;
    }
    availabilityDays.slice(0, 6).forEach(function (day, i) {
      var p = localParts(day.slots[0].startUtc);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'fh-date-cell';
      btn.innerHTML = '<span class="fh-date-cell__day">' + WEEKDAY_ABBR[p.weekday] + '</span><span class="fh-date-cell__num">' + p.day + '</span>';
      if (i === 0) { btn.classList.add('is-selected'); }
      btn.addEventListener('click', function () {
        dateCellsEl.querySelectorAll('.fh-date-cell').forEach(function (c) { c.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        renderTimeChips(day);
      });
      dateCellsEl.appendChild(btn);
    });
    renderTimeChips(availabilityDays[0]);
  }

  function loadAvailability() {
    dateCellsEl.setAttribute('data-state', 'loading');
    dateCellsEl.innerHTML = '<p class="fh-availability-status">Carregando horários disponíveis…</p>';
    timeChipsEl.innerHTML = '';
    fetch('/api/availability?days=14')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'Falha ao carregar horários');
        utcOffsetMinutes = res.utcOffsetMinutes || -180;
        availabilityDays = res.days || [];
        renderDateCells();
      })
      .catch(function () {
        dateCellsEl.innerHTML = '<p class="fh-availability-status">Não foi possível carregar os horários. Fale com a gente pelo WhatsApp.</p>';
      });
  }

  /* ---- Step 3 → 4: confirma o agendamento via /api/bookings ---- */
  var step3Submit = document.getElementById('step3-submit');
  step3Submit.addEventListener('click', function () {
    if (!formState.selectedSlot) return showError('step3-error', 'Escolha um horário disponível.');
    showError('step3-error', '');

    setLoading(step3Submit, true, 'Confirmando…');
    fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ protocolId: formState.protocolId, startUtc: formState.selectedSlot.startUtc })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, body: j }; }); })
      .then(function (res) {
        setLoading(step3Submit, false);
        if (!res.ok) {
          if (res.status === 409) {
            showError('step3-error', 'Esse horário acabou de ser reservado. Escolha outro.');
            loadAvailability();
          } else {
            showError('step3-error', res.body.error || 'Não foi possível confirmar. Tente novamente.');
          }
          return;
        }
        renderConfirmation(res.body);
        goToStep(4);
      })
      .catch(function () {
        setLoading(step3Submit, false);
        showError('step3-error', 'Falha de conexão. Verifique sua internet e tente novamente.');
      });
  });

  function toGCalStamp(iso) {
    return iso.replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }
  function renderConfirmation(booking) {
    var start = new Date(booking.booking.startUtc);
    var p = localParts(booking.booking.startUtc);
    var weekdayFull = start.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' });
    var when = weekdayFull + ', ' + p.day + ' de ' + MONTH_NAME[p.month] + ' às ' + p.hh + ':' + p.mm;

    document.getElementById('confirm-protocol').textContent = formState.protocolId;
    document.getElementById('confirm-datetime').textContent = when;

    var gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('Reunião Fihan · ' + (formState.businessName || formState.name))
      + '&dates=' + toGCalStamp(booking.booking.startUtc) + '/' + toGCalStamp(booking.booking.endUtc)
      + '&details=' + encodeURIComponent('Protocolo ' + formState.protocolId + (booking.meetingUrl ? '\nLink da reunião: ' + booking.meetingUrl : ''))
      + (booking.meetingUrl ? '&location=' + encodeURIComponent(booking.meetingUrl) : '');
    document.getElementById('confirm-add-calendar').href = gcalUrl;

    var joinBtn = document.getElementById('confirm-join-meet');
    if (booking.meetingUrl) {
      joinBtn.href = booking.meetingUrl;
      joinBtn.style.display = '';
    } else {
      joinBtn.style.display = 'none';
    }
  }
})();
