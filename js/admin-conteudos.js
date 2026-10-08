// Fihan OS — Conteúdos: cadastro de projetos e artigos do blog.
(function () {
  const listaView = document.querySelector('[data-view="lista"]');
  const editorView = document.querySelector('[data-view="editor"]');
  const form = document.querySelector('[data-form]');
  if (!listaView || !editorView || !form) return;

  const tipoRadios = Array.from(document.querySelectorAll('input[name="tipo"]'));
  const listaEl = document.querySelector('[data-lista]');
  const emptyMsg = document.querySelector('[data-empty]');
  const novoBtn = document.querySelector('[data-action="novo"]');
  const linkPublico = document.querySelector('[data-link-publico]');
  const notaProjetos = document.querySelector('[data-nota-projetos]');
  const editorTitulo = document.querySelector('[data-editor-titulo]');
  const editorSituacao = document.querySelector('[data-editor-situacao]');
  const msg = document.querySelector('[data-msg]');
  const slugBase = document.querySelector('[data-slug-base]');
  const tituloInput = form.querySelector('[data-campo="titulo"]');
  const slugInput = form.querySelector('[data-campo="slug"]');
  const capaPreview = form.querySelector('[data-capa-preview]');
  const capaArquivo = form.querySelector('[data-capa-arquivo]');
  const capaRemover = form.querySelector('[data-capa-remover]');
  const corpo = form.querySelector('[data-dado="corpo"]');
  const corpoArquivo = form.querySelector('[data-corpo-arquivo]');
  const botoes = {
    salvar: form.querySelector('[data-action="salvar"]'),
    previa: form.querySelector('[data-action="previa"]'),
    publicar: form.querySelector('[data-action="publicar"]'),
    despublicar: form.querySelector('[data-action="despublicar"]'),
    excluir: form.querySelector('[data-action="excluir"]'),
  };

  const TIPOS = {
    projeto: { nome: 'projeto', novo: 'Novo projeto', base: '/trabalhos', vazio: 'Nenhum projeto cadastrado ainda.' },
    post: { nome: 'artigo', novo: 'Novo artigo', base: '/blog', vazio: 'Nenhum artigo cadastrado ainda.' },
  };
  const MAX_LADO = 2000; // px — imagens maiores são reduzidas antes do envio
  const MAX_BYTES = 3 * 1024 * 1024;

  let tipo = 'projeto';
  let atual = null; // conteúdo aberto no editor (null = novo)
  let capa = '';
  let slugManual = false;
  let alterado = false;
  let ocupado = false;

  // ---- chamadas à API ----
  async function api(method, body, qs) {
    const res = await fetch(`/api/cms${qs ? `?${qs}` : ''}`, {
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
  function slugify(value) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  // ---- lista ----
  function aplicarTipo() {
    const t = TIPOS[tipo];
    novoBtn.textContent = t.novo;
    linkPublico.href = t.base;
    notaProjetos.hidden = tipo !== 'projeto';
  }

  async function carregarLista() {
    aplicarTipo();
    listaEl.innerHTML = '';
    emptyMsg.textContent = 'Carregando…';
    listaEl.appendChild(emptyMsg);
    try {
      const { conteudos } = await api('GET', null, `tipo=${tipo}`);
      listaEl.innerHTML = '';
      if (!conteudos.length) {
        emptyMsg.textContent = TIPOS[tipo].vazio;
        listaEl.appendChild(emptyMsg);
        return;
      }
      conteudos.forEach((c) => {
        const publicado = c.status === 'publicado';
        const caminho = `${TIPOS[tipo].base}/${c.slug}`;
        const row = document.createElement('div');
        row.className = 'admin-row';
        row.innerHTML = `
          <div class="admin-cell-name">
            <div class="admin-cell-name__text">
              <span class="admin-cell-name__title" title="${escapeHtml(c.titulo)}">${escapeHtml(c.titulo)}</span>
              <span class="admin-cell-name__sub" title="${escapeHtml(c.resumo)}">${escapeHtml(c.resumo || '—')}</span>
            </div>
          </div>
          ${publicado
            ? `<a class="admin-row__link" href="${escapeHtml(caminho)}" target="_blank" rel="noopener">${escapeHtml(caminho)}</a>`
            : `<span class="admin-row__link">${escapeHtml(caminho)}</span>`}
          <span><span class="admin-badge ${publicado ? 'admin-badge--positive' : 'admin-badge--neutral'}">${publicado ? 'Publicado' : 'Rascunho'}</span></span>
          <span>${formatDate(c.updated_at)}</span>
          <button type="button" class="admin-row__detail" data-editar="${c.id}">Editar</button>
        `;
        listaEl.appendChild(row);
      });
    } catch (err) {
      console.error('falha ao carregar conteúdos:', err);
      listaEl.innerHTML = '';
      emptyMsg.textContent = 'Não foi possível carregar os conteúdos agora.';
      listaEl.appendChild(emptyMsg);
    }
  }

  tipoRadios.forEach((r) => r.addEventListener('change', () => {
    tipo = tipoRadios.find((x) => x.checked).value;
    carregarLista();
  }));

  listaEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-editar]');
    if (!btn) return;
    btn.disabled = true;
    try {
      const { conteudo } = await api('GET', null, `id=${btn.dataset.editar}`);
      abrirEditor(conteudo);
    } catch (err) {
      console.error('falha ao abrir conteúdo:', err);
      window.alert(err.message);
    } finally {
      btn.disabled = false;
    }
  });
  novoBtn.addEventListener('click', () => abrirEditor(null));

  // ---- listas de pares (ficha, etapas, entregas) ----
  function addLinha(nome, valores) {
    const box = form.querySelector(`[data-repeater="${nome}"]`);
    if (box.children.length >= Number(box.dataset.max)) return;
    const bloco = box.classList.contains('admin-repeater--bloco');
    const linha = document.createElement('div');
    linha.className = 'admin-repeater__linha';

    const a = document.createElement('input');
    a.type = 'text';
    a.maxLength = 200;
    a.placeholder = box.dataset.phA;
    a.dataset.k = box.dataset.a;
    a.value = (valores && valores[box.dataset.a]) || '';

    const b = document.createElement(bloco ? 'textarea' : 'input');
    if (bloco) b.rows = 3; else b.type = 'text';
    b.maxLength = 1500;
    b.placeholder = box.dataset.phB;
    b.dataset.k = box.dataset.b;
    b.value = (valores && valores[box.dataset.b]) || '';

    const remover = document.createElement('button');
    remover.type = 'button';
    remover.className = 'admin-repeater__remover';
    remover.setAttribute('aria-label', 'Remover');
    remover.textContent = '×';
    remover.addEventListener('click', () => { linha.remove(); alterado = true; });

    linha.append(a, b, remover);
    box.appendChild(linha);
    return a;
  }
  function lerLinhas(nome) {
    const box = form.querySelector(`[data-repeater="${nome}"]`);
    return Array.from(box.children).map((linha) => {
      const item = {};
      linha.querySelectorAll('[data-k]').forEach((el) => { item[el.dataset.k] = el.value.trim(); });
      return item;
    });
  }
  form.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const primeiro = addLinha(btn.dataset.add);
      if (primeiro) primeiro.focus();
      alterado = true;
    });
  });

  // ---- imagens ----
  function lerBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
      reader.readAsDataURL(blob);
    });
  }
  function carregarImagem(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Este arquivo não é uma imagem válida.')); };
      img.src = url;
    });
  }
  // reduz para no máximo MAX_LADO e converte para WebP (JPEG onde o navegador
  // não gera WebP); GIF pequeno segue como está para não perder a animação
  async function preparar(file) {
    if (file.type === 'image/gif' && file.size <= MAX_BYTES) return file;
    const img = await carregarImagem(file);
    const escala = Math.min(1, MAX_LADO / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * escala);
    canvas.height = Math.round(img.naturalHeight * escala);
    const ctx = canvas.getContext('2d');
    const gerar = (mime) => new Promise((resolve) => canvas.toBlob(resolve, mime, 0.85));

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    let blob = await gerar('image/webp');
    if (!blob || blob.type !== 'image/webp') {
      // JPEG não tem transparência — pinta o fundo de branco antes
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      blob = await gerar('image/jpeg');
    }
    if (!blob) throw new Error('Não foi possível processar a imagem.');
    return blob;
  }
  async function enviarImagem(file) {
    const blob = await preparar(file);
    if (blob.size > MAX_BYTES) throw new Error('Imagem grande demais, mesmo depois de reduzida. Tente outra.');
    const { url } = await api('POST', { acao: 'upload', mime: blob.type, base64: await lerBase64(blob) });
    return url;
  }

  function mostrarCapa() {
    capaPreview.hidden = !capa;
    capaRemover.hidden = !capa;
    if (capa) capaPreview.src = capa;
    else capaPreview.removeAttribute('src');
  }
  capaArquivo.addEventListener('change', async () => {
    const file = capaArquivo.files[0];
    capaArquivo.value = '';
    if (!file) return;
    avisar('Enviando imagem…');
    try {
      capa = await enviarImagem(file);
      alterado = true;
      mostrarCapa();
      avisar('');
    } catch (err) {
      console.error('falha ao enviar imagem:', err);
      avisar(err.message, 'error');
    }
  });
  capaRemover.addEventListener('click', () => { capa = ''; alterado = true; mostrarCapa(); });

  // ---- barra de formatação do artigo ----
  function inserir(antes, depois, padrao) {
    const ini = corpo.selectionStart;
    const fim = corpo.selectionEnd;
    const trecho = corpo.value.slice(ini, fim) || padrao;
    corpo.setRangeText(antes + trecho + depois, ini, fim, 'end');
    corpo.focus();
    corpo.setSelectionRange(ini + antes.length, ini + antes.length + trecho.length);
    alterado = true;
  }
  // prefixa cada linha selecionada (ou a linha do cursor)
  function prefixar(prefixo, padrao) {
    const ini = corpo.value.lastIndexOf('\n', corpo.selectionStart - 1) + 1;
    let fim = corpo.value.indexOf('\n', corpo.selectionEnd);
    if (fim === -1) fim = corpo.value.length;
    const linhas = (corpo.value.slice(ini, fim) || padrao).split('\n').map((l) => prefixo + l);
    corpo.setRangeText(linhas.join('\n'), ini, fim, 'end');
    corpo.focus();
    alterado = true;
  }
  form.querySelector('[data-toolbar]').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-md]');
    if (!btn) return;
    switch (btn.dataset.md) {
      case 'titulo': prefixar('## ', 'Título'); break;
      case 'subtitulo': prefixar('### ', 'Subtítulo'); break;
      case 'negrito': inserir('**', '**', 'texto em negrito'); break;
      case 'italico': inserir('*', '*', 'texto em itálico'); break;
      case 'lista': prefixar('- ', 'item'); break;
      case 'citacao': prefixar('> ', 'citação'); break;
      case 'link': {
        const url = window.prompt('Endereço do link (comece com https://):', 'https://');
        if (url && url !== 'https://') inserir('[', `](${url.trim()})`, 'texto do link');
        break;
      }
      default:
    }
  });
  corpoArquivo.addEventListener('change', async () => {
    const file = corpoArquivo.files[0];
    corpoArquivo.value = '';
    if (!file) return;
    avisar('Enviando imagem…');
    try {
      const url = await enviarImagem(file);
      const pos = corpo.selectionStart;
      corpo.setRangeText(`\n\n![descreva a imagem](${url})\n\n`, pos, corpo.selectionEnd, 'end');
      corpo.focus();
      alterado = true;
      avisar('Imagem inserida no texto.', 'ok');
    } catch (err) {
      console.error('falha ao enviar imagem:', err);
      avisar(err.message, 'error');
    }
  });

  // ---- editor ----
  function atualizarBotoes() {
    const publicado = Boolean(atual && atual.status === 'publicado');
    botoes.salvar.textContent = publicado ? 'Salvar alterações' : 'Salvar rascunho';
    botoes.publicar.hidden = publicado;
    botoes.despublicar.hidden = !publicado;
    botoes.excluir.hidden = !atual;
    editorTitulo.textContent = atual ? atual.titulo : TIPOS[tipo].novo;
    editorSituacao.textContent = publicado
      ? `No ar em fihan.com.br${TIPOS[tipo].base}/${atual.slug}. Ao salvar, as mudanças vão para o site em até um minuto.`
      : 'Rascunho: só aparece no site depois de publicado.';
  }

  function abrirEditor(conteudo) {
    atual = conteudo;
    const dados = (conteudo && conteudo.dados) || {};

    form.reset();
    form.querySelectorAll('[data-repeater]').forEach((box) => { box.innerHTML = ''; });
    form.querySelectorAll('[data-so]').forEach((el) => { el.hidden = el.dataset.so !== tipo; });
    slugBase.textContent = `fihan.com.br${TIPOS[tipo].base}/`;

    tituloInput.value = conteudo ? conteudo.titulo : '';
    slugInput.value = conteudo ? conteudo.slug : '';
    form.querySelector('[data-campo="resumo"]').value = conteudo ? conteudo.resumo : '';
    form.querySelectorAll('[data-dado]').forEach((el) => { el.value = dados[el.dataset.dado] || ''; });
    form.querySelectorAll('[data-repeater]').forEach((box) => {
      (dados[box.dataset.repeater] || []).forEach((item) => addLinha(box.dataset.repeater, item));
    });
    // projeto novo já começa com as quatro linhas da ficha das páginas existentes
    if (!conteudo && tipo === 'projeto') {
      ['Segmento', 'Formato', 'Entregas', 'Publicado em'].forEach((rotulo) => addLinha('ficha', { rotulo }));
    }

    capa = conteudo ? conteudo.capa : '';
    mostrarCapa();
    slugManual = Boolean(conteudo);
    alterado = false;
    avisar('');
    atualizarBotoes();

    listaView.hidden = true;
    editorView.hidden = false;
    window.scrollTo(0, 0);
    tituloInput.focus();
  }

  function fecharEditor() {
    editorView.hidden = true;
    listaView.hidden = false;
    atual = null;
    alterado = false;
    carregarLista();
  }

  tituloInput.addEventListener('input', () => {
    if (!slugManual) slugInput.value = slugify(tituloInput.value);
  });
  slugInput.addEventListener('input', () => { slugManual = true; });
  slugInput.addEventListener('blur', () => { slugInput.value = slugify(slugInput.value); });
  form.addEventListener('input', () => { alterado = true; });
  form.addEventListener('submit', (e) => e.preventDefault());
  window.addEventListener('beforeunload', (e) => {
    if (alterado && !editorView.hidden) e.preventDefault();
  });

  function coletar(status) {
    const dados = {};
    form.querySelectorAll(`[data-so="${tipo}"] [data-dado], [data-dado="seoDescricao"]`).forEach((el) => {
      dados[el.dataset.dado] = el.value.trim();
    });
    form.querySelectorAll(`[data-so="${tipo}"] [data-repeater]`).forEach((box) => {
      dados[box.dataset.repeater] = lerLinhas(box.dataset.repeater);
    });
    return {
      acao: 'salvar',
      id: atual ? atual.id : undefined,
      tipo,
      status,
      titulo: tituloInput.value.trim(),
      slug: slugInput.value.trim(),
      resumo: form.querySelector('[data-campo="resumo"]').value.trim(),
      capa,
      dados,
    };
  }

  async function salvar(status, mensagem) {
    if (ocupado) return false;
    ocupado = true;
    Object.values(botoes).forEach((b) => { b.disabled = true; });
    avisar('Salvando…');
    try {
      const { conteudo } = await api('POST', coletar(status));
      atual = conteudo;
      slugInput.value = conteudo.slug;
      slugManual = true;
      alterado = false;
      atualizarBotoes();
      avisar(mensagem, 'ok');
      return true;
    } catch (err) {
      console.error('falha ao salvar conteúdo:', err);
      avisar(err.message, 'error');
      return false;
    } finally {
      ocupado = false;
      Object.values(botoes).forEach((b) => { b.disabled = false; });
    }
  }

  const statusAtual = () => (atual && atual.status === 'publicado' ? 'publicado' : 'rascunho');

  botoes.salvar.addEventListener('click', () => {
    salvar(statusAtual(), statusAtual() === 'publicado' ? 'Alterações salvas. Entram no site em até um minuto.' : 'Rascunho salvo.');
  });
  botoes.publicar.addEventListener('click', () => {
    salvar('publicado', 'Publicado. Aparece no site em até um minuto.');
  });
  botoes.despublicar.addEventListener('click', () => {
    if (!window.confirm('Tirar este conteúdo do ar? Ele volta a ser rascunho e some do site.')) return;
    salvar('rascunho', 'Conteúdo fora do ar. Sai do site em até um minuto.');
  });
  botoes.previa.addEventListener('click', async () => {
    // a aba precisa abrir já no clique, antes do salvamento, para o navegador
    // não bloquear como pop-up
    const aba = window.open('', '_blank');
    const ok = await salvar(statusAtual(), 'Salvo. A pré-visualização abriu em outra aba.');
    if (!aba) return;
    if (ok) aba.location.href = `/api/cms?previa=${atual.id}`;
    else aba.close();
  });
  botoes.excluir.addEventListener('click', async () => {
    if (!atual || ocupado) return;
    if (!window.confirm(`Excluir "${atual.titulo}" de vez? Não dá para desfazer.`)) return;
    try {
      await api('POST', { acao: 'excluir', id: atual.id });
      fecharEditor();
    } catch (err) {
      console.error('falha ao excluir conteúdo:', err);
      avisar(err.message, 'error');
    }
  });
  document.querySelector('[data-action="voltar"]').addEventListener('click', () => {
    if (alterado && !window.confirm('Há mudanças não salvas. Sair mesmo assim?')) return;
    fecharEditor();
  });

  carregarLista();
})();
