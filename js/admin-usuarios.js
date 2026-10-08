// Fihan OS — Usuários: quem pode entrar no painel.
(function () {
  const listaEl = document.querySelector('[data-usuarios]');
  const emptyMsg = document.querySelector('[data-empty]');
  const form = document.querySelector('[data-form-usuario]');
  const msg = document.querySelector('[data-msg]');
  if (!listaEl || !form) return;

  const SENHA_MIN = 8;
  const submitBtn = form.querySelector('button[type="submit"]');

  async function api(method, body) {
    const res = await fetch('/api/usuarios', {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) { window.location.href = '/admin/login'; throw new Error('sessão expirada'); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Não foi possível concluir agora. Tente de novo.');
    return json;
  }

  function avisar(texto, estado) {
    msg.textContent = texto || '';
    msg.dataset.state = estado || '';
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }
  function formatDate(sqlDate) {
    return new Date(`${sqlDate.replace(' ', 'T')}Z`).toLocaleDateString('pt-BR');
  }

  async function carregar() {
    try {
      const { usuarios } = await api('GET');
      listaEl.innerHTML = '';
      if (!usuarios.length) {
        emptyMsg.textContent = 'Nenhum usuário cadastrado ainda. Crie o primeiro abaixo.';
        listaEl.appendChild(emptyMsg);
        return;
      }
      usuarios.forEach((u) => {
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML = `
          <span class="admin-cell-name__title" title="${escapeHtml(u.nome)}">${escapeHtml(u.nome)}</span>
          <span class="admin-row__link" title="${escapeHtml(u.email)}">${escapeHtml(u.email)}</span>
          <span>${formatDate(u.created_at)}</span>
          <div class="admin-row__acoes">
            <button type="button" class="admin-row__detail" data-senha="${u.id}" data-nome="${escapeHtml(u.nome)}">Trocar senha</button>
            <button type="button" class="admin-row__detail admin-row__detail--perigo" data-excluir="${u.id}" data-nome="${escapeHtml(u.nome)}">Remover</button>
          </div>
        `;
        listaEl.appendChild(row);
      });
    } catch (err) {
      console.error('falha ao carregar usuários:', err);
      listaEl.innerHTML = '';
      emptyMsg.textContent = 'Não foi possível carregar os usuários agora.';
      listaEl.appendChild(emptyMsg);
    }
  }

  listaEl.addEventListener('click', async (e) => {
    const senhaBtn = e.target.closest('[data-senha]');
    const excluirBtn = e.target.closest('[data-excluir]');
    try {
      if (senhaBtn) {
        const senha = window.prompt(`Nova senha de ${senhaBtn.dataset.nome} (pelo menos ${SENHA_MIN} caracteres):`);
        if (senha === null) return;
        await api('POST', { acao: 'senha', id: Number(senhaBtn.dataset.senha), senha });
        avisar(`Senha de ${senhaBtn.dataset.nome} trocada.`, 'ok');
      } else if (excluirBtn) {
        if (!window.confirm(`Remover ${excluirBtn.dataset.nome}? Essa pessoa não consegue mais entrar no painel.`)) return;
        await api('POST', { acao: 'excluir', id: Number(excluirBtn.dataset.excluir) });
        avisar(`${excluirBtn.dataset.nome} removido.`, 'ok');
        carregar();
      }
    } catch (err) {
      console.error('falha na ação do usuário:', err);
      avisar(err.message, 'error');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    submitBtn.disabled = true;
    avisar('Criando…');
    try {
      await api('POST', {
        acao: 'criar',
        nome: data.get('nome'),
        email: data.get('email'),
        senha: data.get('senha'),
      });
      form.reset();
      avisar('Usuário criado. Já pode entrar com o e-mail e a senha.', 'ok');
      carregar();
    } catch (err) {
      console.error('falha ao criar usuário:', err);
      avisar(err.message, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });

  carregar();
})();
