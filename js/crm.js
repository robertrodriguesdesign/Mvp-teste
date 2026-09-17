(function () {
  const tabs = Array.from(document.querySelectorAll('[data-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  const modeRadios = Array.from(document.querySelectorAll('input[name="filter-mode"]'));
  const dateField = document.querySelector('[data-field="date"]');
  const fromField = document.querySelector('[data-field="from"]');
  const toField = document.querySelector('[data-field="to"]');
  const sep = document.querySelector('.crm-filter__sep');
  const applyBtn = document.querySelector('[data-action="apply-filter"]');
  const clearBtn = document.querySelector('[data-action="clear-filter"]');
  const chartEl = document.querySelector('[data-chart]');
  const leadsBody = document.querySelector('[data-leads-body]');
  const emptyMsg = document.querySelector('[data-empty]');
  const modal = document.querySelector('[data-modal]');

  let leadsById = new Map();

  // ---- tabs ----
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      panels.forEach((p) => p.classList.toggle('is-active', p.dataset.panel === tab.dataset.tab));
    });
  });

  // ---- filtro: dia vs período ----
  function updateFilterMode() {
    const mode = modeRadios.find((r) => r.checked).value;
    const isRange = mode === 'periodo';
    dateField.hidden = isRange;
    fromField.hidden = !isRange;
    toField.hidden = !isRange;
    sep.hidden = !isRange;
  }
  modeRadios.forEach((r) => r.addEventListener('change', updateFilterMode));
  updateFilterMode();

  function currentRange() {
    const mode = modeRadios.find((r) => r.checked).value;
    if (mode === 'dia') {
      const d = dateField.value;
      return d ? { from: d, to: d } : {};
    }
    return { from: fromField.value || undefined, to: toField.value || undefined };
  }

  applyBtn.addEventListener('click', () => loadLeads(currentRange()));
  clearBtn.addEventListener('click', () => {
    dateField.value = '';
    fromField.value = '';
    toField.value = '';
    loadLeads({});
  });

  // ---- busca dos leads ----
  async function loadLeads(range) {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    const qs = params.toString();

    try {
      const res = await fetch(`/api/leads${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { leads } = await res.json();
      leadsById = new Map(leads.map((l) => [l.id, l]));
      renderStats(leads);
      renderChart(leads);
      renderTable(leads);
    } catch (err) {
      console.error('falha ao carregar leads:', err);
      leadsBody.innerHTML = '';
      emptyMsg.textContent = 'Não foi possível carregar os leads agora.';
      leadsBody.appendChild(emptyMsg);
    }
  }

  // ---- dia (YYYY-MM-DD) a partir de "created_at" (SQLite datetime UTC) ----
  function dayOf(createdAt) {
    return createdAt.slice(0, 10);
  }
  function formatDay(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  function renderStats(leads) {
    const byDay = new Map();
    leads.forEach((l) => {
      const d = dayOf(l.created_at);
      byDay.set(d, (byDay.get(d) || 0) + 1);
    });
    document.querySelector('[data-stat="total"]').textContent = leads.length;
    if (byDay.size) {
      const peak = Array.from(byDay.entries()).sort((a, b) => b[1] - a[1])[0];
      document.querySelector('[data-stat="peak-day"]').textContent = `${formatDay(peak[0])} (${peak[1]})`;
      document.querySelector('[data-stat="avg"]').textContent = (leads.length / byDay.size).toFixed(1);
    } else {
      document.querySelector('[data-stat="peak-day"]').textContent = '—';
      document.querySelector('[data-stat="avg"]').textContent = '0';
    }
  }

  function renderChart(leads) {
    chartEl.innerHTML = '';
    if (!leads.length) {
      chartEl.innerHTML = '<p class="crm-chart-empty">Sem leads para exibir no período.</p>';
      return;
    }
    const byDay = new Map();
    leads.forEach((l) => {
      const d = dayOf(l.created_at);
      byDay.set(d, (byDay.get(d) || 0) + 1);
    });
    const days = Array.from(byDay.keys()).sort();
    const max = Math.max(...byDay.values());
    days.forEach((day) => {
      const count = byDay.get(day);
      const bar = document.createElement('div');
      bar.className = 'crm-bar';
      bar.innerHTML = `
        <span class="crm-bar__value">${count}</span>
        <span class="crm-bar__fill" style="height:${Math.max((count / max) * 100, 4)}%"></span>
        <span class="crm-bar__day">${formatDay(day)}</span>
      `;
      chartEl.appendChild(bar);
    });
  }

  function renderTable(leads) {
    leadsBody.innerHTML = '';
    if (!leads.length) {
      leadsBody.appendChild(emptyMsg);
      return;
    }
    leads.forEach((lead) => {
      const row = document.createElement('div');
      row.className = 'crm-row';
      row.innerHTML = `
        <span title="${escapeHtml(lead.nome)}">${escapeHtml(lead.nome)}</span>
        <span title="${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</span>
        <span title="${escapeHtml(lead.whatsapp || '')}">${escapeHtml(lead.whatsapp || '—')}</span>
        <button type="button" class="crm-row__detail" data-lead-id="${lead.id}">
          Ver detalhes
          <svg viewBox="0 0 15 11" fill="none" aria-hidden="true"><path d="M8.01037 2.15005H10.1604V0H8.01037V2.15005Z" fill="currentColor"/><path d="M10.1609 4.30235H12.3109V2.15H10.1609V4.30235Z" fill="currentColor"/><path d="M8.01037 10.7525H10.1604V8.60011H8.01037V10.7525Z" fill="currentColor"/><path d="M10.1609 8.60244H12.3109V6.45239H10.1609V8.60244Z" fill="currentColor"/><path d="M9.62339 4.56969H0V6.18281H9.62339V4.56969Z" fill="currentColor"/><path d="M12.3104 6.45244H14.9997V4.30239H12.3104V6.45244Z" fill="currentColor"/></svg>
        </button>
      `;
      leadsBody.appendChild(row);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- modal de detalhes ----
  function waLink(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '#';
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${withCountry}`;
  }

  function openModal(lead) {
    document.querySelector('[data-detail="created_at"]').textContent = new Date(`${lead.created_at.replace(' ', 'T')}Z`).toLocaleString('pt-BR');
    document.querySelector('[data-detail="nome"]').textContent = lead.nome;
    document.querySelector('[data-detail="email"]').textContent = lead.email;
    document.querySelector('[data-detail="whatsapp"]').textContent = lead.whatsapp || '—';
    document.querySelector('[data-detail="empresa"]').textContent = lead.empresa || '—';
    document.querySelector('[data-detail="estagio"]').textContent = lead.estagio || '—';
    document.querySelector('[data-detail="eixos"]').textContent = lead.eixos || '—';
    document.querySelector('[data-detail="investimento"]').textContent = lead.investimento || '—';
    document.querySelector('[data-detail="urgencia"]').textContent = lead.urgencia || '—';
    document.querySelector('[data-detail="mensagem"]').textContent = lead.mensagem || '—';

    modal.querySelector('[data-detail-href="email"]').href = `mailto:${lead.email}`;
    const waBtn = modal.querySelector('[data-detail-href="whatsapp"]');
    if (lead.whatsapp) {
      waBtn.href = waLink(lead.whatsapp);
      waBtn.style.display = '';
    } else {
      waBtn.style.display = 'none';
    }

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }
  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  leadsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lead-id]');
    if (!btn) return;
    const lead = leadsById.get(Number(btn.dataset.leadId));
    if (lead) openModal(lead);
  });
  modal.querySelectorAll('[data-modal-close]').forEach((el) => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  loadLeads({});
})();
