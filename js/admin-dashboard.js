(function () {
  const modeRadios = Array.from(document.querySelectorAll('input[name="filter-mode"]'));
  const dateField = document.querySelector('[data-field="date"]');
  const fromField = document.querySelector('[data-field="from"]');
  const toField = document.querySelector('[data-field="to"]');
  const sep = document.querySelector('.admin-filter__sep');
  const applyBtn = document.querySelector('[data-action="apply-filter"]');
  const clearBtn = document.querySelector('[data-action="clear-filter"]');
  const chartEl = document.querySelector('[data-chart]');
  if (!modeRadios.length || !chartEl) return;

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

  async function loadLeads(range) {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    const qs = params.toString();

    try {
      const res = await fetch(`/api/leads${qs ? `?${qs}` : ''}`);
      if (res.status === 401) { window.location.href = '/admin/login'; return; }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const { leads } = await res.json();
      renderStats(leads);
      renderChart(leads);
    } catch (err) {
      console.error('falha ao carregar leads:', err);
      chartEl.innerHTML = '<p class="admin-chart-empty">Não foi possível carregar os dados agora.</p>';
    }
  }

  // ---- dia (YYYY-MM-DD) a partir de "created_at" (SQLite datetime UTC) ----
  function dayOf(createdAt) { return createdAt.slice(0, 10); }
  function formatDay(iso) {
    const [, m, d] = iso.split('-');
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
      chartEl.innerHTML = '<p class="admin-chart-empty">Sem leads para exibir no período.</p>';
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
      bar.className = 'admin-bar';
      bar.innerHTML = `
        <span class="admin-bar__value">${count}</span>
        <span class="admin-bar__fill" style="height:${Math.max((count / max) * 100, 4)}%"></span>
        <span class="admin-bar__day">${formatDay(day)}</span>
      `;
      chartEl.appendChild(bar);
    });
  }

  loadLeads({});
})();
