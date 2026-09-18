(function () {
  const modeRadios = Array.from(document.querySelectorAll('input[name="filter-mode"]'));
  const dateField = document.querySelector('[data-field="date"]');
  const fromField = document.querySelector('[data-field="from"]');
  const toField = document.querySelector('[data-field="to"]');
  const sep = document.querySelector('.admin-filter__sep');
  const applyBtn = document.querySelector('[data-action="apply-filter"]');
  const clearBtn = document.querySelector('[data-action="clear-filter"]');
  const searchInput = document.querySelector('[data-search]');
  const estagioFilter = document.querySelector('[data-estagio-filter]');
  const leadsBody = document.querySelector('[data-leads-body]');
  const emptyMsg = document.querySelector('[data-empty]');
  const pagination = document.querySelector('[data-pagination]');
  const pagesEl = document.querySelector('[data-pagination-pages]');
  const prevBtn = document.querySelector('[data-page-prev]');
  const nextBtn = document.querySelector('[data-page-next]');
  const drawer = document.querySelector('[data-drawer]');
  if (!leadsBody || !drawer) return;

  const PAGE_SIZE = 10;
  const AVATAR_COLORS = ['#14CC52', '#358CF9', '#6D62B3', '#EA5623', '#5D5398'];

  let allLeads = [];
  let filtered = [];
  let leadsById = new Map();
  let page = 1;

  // ---- filtro dia/período (mesmo mecanismo do dashboard) ----
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

  // ---- busca e filtro de estágio: client-side, sobre o range já buscado ----
  searchInput.addEventListener('input', () => { page = 1; applyClientFilters(); });
  estagioFilter.addEventListener('change', () => { page = 1; applyClientFilters(); });

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
      allLeads = leads;
      leadsById = new Map(leads.map((l) => [l.id, l]));
      page = 1;
      applyClientFilters();
    } catch (err) {
      console.error('falha ao carregar leads:', err);
      leadsBody.innerHTML = '';
      emptyMsg.textContent = 'Não foi possível carregar os leads agora.';
      leadsBody.appendChild(emptyMsg);
      pagination.hidden = true;
    }
  }

  function applyClientFilters() {
    const q = searchInput.value.trim().toLowerCase();
    const estagio = estagioFilter.value;
    filtered = allLeads.filter((lead) => {
      if (estagio && lead.estagio !== estagio) return false;
      if (!q) return true;
      return [lead.nome, lead.email, lead.empresa]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
    renderTable();
  }

  function avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % AVATAR_COLORS.length;
    return AVATAR_COLORS[hash];
  }
  function initials(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }
  function formatDate(createdAt) {
    return new Date(`${createdAt.replace(' ', 'T')}Z`).toLocaleDateString('pt-BR');
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function renderTable() {
    leadsBody.innerHTML = '';
    if (!filtered.length) {
      emptyMsg.textContent = allLeads.length
        ? 'Nenhum lead corresponde à busca/filtro.'
        : 'Nenhum lead no período selecionado.';
      leadsBody.appendChild(emptyMsg);
      pagination.hidden = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(page, totalPages);
    const start = (page - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(start, start + PAGE_SIZE);

    pageItems.forEach((lead) => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      row.innerHTML = `
        <div class="admin-cell-name">
          <div class="admin-avatar" style="background:${avatarColor(lead.nome)}">${initials(lead.nome)}</div>
          <div class="admin-cell-name__text">
            <span class="admin-cell-name__title" title="${escapeHtml(lead.nome)}">${escapeHtml(lead.nome)}</span>
            <span class="admin-cell-name__sub" title="${escapeHtml(lead.empresa || '')}">${escapeHtml(lead.empresa || '—')}</span>
          </div>
        </div>
        <div class="admin-cell-contact">
          <span title="${escapeHtml(lead.email)}">${escapeHtml(lead.email)}</span>
          <span class="is-subtle" title="${escapeHtml(lead.whatsapp || '')}">${escapeHtml(lead.whatsapp || '—')}</span>
        </div>
        <span>${lead.estagio ? `<span class="admin-badge admin-badge--neutral">${escapeHtml(lead.estagio)}</span>` : '—'}</span>
        <span>${formatDate(lead.created_at)}</span>
        <button type="button" class="admin-row__detail" data-lead-id="${lead.id}">
          Detalhes
          <svg viewBox="0 0 15 11" fill="none" aria-hidden="true"><path d="M8.01037 2.15005H10.1604V0H8.01037V2.15005Z" fill="currentColor"/><path d="M10.1609 4.30235H12.3109V2.15H10.1609V4.30235Z" fill="currentColor"/><path d="M8.01037 10.7525H10.1604V8.60011H8.01037V10.7525Z" fill="currentColor"/><path d="M10.1609 8.60244H12.3109V6.45239H10.1609V8.60244Z" fill="currentColor"/><path d="M9.62339 4.56969H0V6.18281H9.62339V4.56969Z" fill="currentColor"/><path d="M12.3104 6.45244H14.9997V4.30239H12.3104V6.45244Z" fill="currentColor"/></svg>
        </button>
      `;
      leadsBody.appendChild(row);
    });

    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    if (totalPages <= 1) { pagination.hidden = true; return; }
    pagination.hidden = false;
    prevBtn.disabled = page === 1;
    nextBtn.disabled = page === totalPages;

    pagesEl.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'admin-pagination__page' + (i === page ? ' is-active' : '');
      btn.textContent = String(i);
      btn.addEventListener('click', () => { page = i; renderTable(); });
      pagesEl.appendChild(btn);
    }
  }
  prevBtn.addEventListener('click', () => { if (page > 1) { page -= 1; renderTable(); } });
  nextBtn.addEventListener('click', () => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    if (page < totalPages) { page += 1; renderTable(); }
  });

  // ---- drawer de detalhes ----
  function waLink(phone) {
    const digits = (phone || '').replace(/\D/g, '');
    if (!digits) return '#';
    const withCountry = digits.length <= 11 ? `55${digits}` : digits;
    return `https://wa.me/${withCountry}`;
  }

  function openDrawer(lead) {
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

    drawer.querySelector('[data-detail-href="email"]').href = `mailto:${lead.email}`;
    const waBtn = drawer.querySelector('[data-detail-href="whatsapp"]');
    if (lead.whatsapp) {
      waBtn.href = waLink(lead.whatsapp);
      waBtn.style.display = '';
    } else {
      waBtn.style.display = 'none';
    }

    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  leadsBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-lead-id]');
    if (!btn) return;
    const lead = leadsById.get(Number(btn.dataset.leadId));
    if (lead) openDrawer(lead);
  });
  drawer.querySelectorAll('[data-drawer-close]').forEach((el) => el.addEventListener('click', closeDrawer));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

  loadLeads({});
})();
