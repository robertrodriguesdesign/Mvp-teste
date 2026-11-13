/* Fihan — Pré-Work do cliente (/pre-work/<token>).
   Sete etapas com as respostas guardadas na sessão do navegador, PDF enviado
   na hora em que é escolhido e envio final para /api/pre-work. As regras do
   servidor ficam em api/_prework.js. */
(function () {
  'use strict';

  var form = document.getElementById('pre-work');
  if (!form) return;

  var MAX_PDF = 3 * 1024 * 1024;
  var MAX_CONCORRENTES = 12;
  var ORDEM = ['inicio', '1', '2', '3', '4', '5', '6a', '6b', '7'];
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // itens da etapa 6A que, quando existem, pedem o vínculo com um material
  var ITENS_MARCA = {
    identidade: { campo: 'marca.identidade', existentes: ['Sim, está em uso', 'Está em desenvolvimento'], titulo: 'Onde está a identidade visual?' },
    estrategia: { campo: 'marca.estrategia', existentes: ['Sim', 'Em parte'], titulo: 'Onde está a estratégia de marca?' }
  };

  var PERGUNTAS = [
    { chave: 'q1', texto: 'Qual é o propósito da empresa?' },
    { chave: 'q2', texto: 'Quais perfis de clientes a empresa atende hoje?' },
    {
      chave: 'q3',
      texto: function () {
        var nome = estado.identificacao.projeto.trim();
        return nome ? 'Por que vocês escolheram o nome “' + nome + '”?' : 'Por que vocês escolheram o nome informado na etapa 2?';
      },
      dica: 'Conte o motivo da escolha.'
    },
    { chave: 'q4', texto: 'Quando a empresa foi fundada e quais marcos ajudam a contar sua história?', dica: 'A data pode ser aproximada.' },
    { chave: 'q5', texto: 'Como vocês se comunicam com esses clientes hoje? Quais canais usam?' },
    { chave: 'q6', texto: 'Quais exemplos recentes mostram como vocês se comunicam?', dica: 'Indique links ou referências. Se ainda não houver exemplos, deixe em branco.', opcional: true },
    { chave: 'q7', texto: 'Quais são os principais desafios da empresa no cenário em que atua?' },
    { chave: 'q8', texto: 'Qual é a principal meta da empresa no curto, médio e longo prazo?', metas: true },
    { chave: 'q9', texto: 'O que vocês esperam que este projeto ajude a resolver?' },
    { chave: 'q10', texto: 'Quais marcas inspiram vocês e o que podemos aprender com elas?' }
  ];

  var match = location.pathname.match(/^\/pre-work\/([A-Za-z0-9_-]{20,64})\/?$/);
  var token = match ? match[1] : '';
  var CHAVE_SESSAO = 'fihan-prework:' + token;

  var estado = novoEstado();
  var etapa = 'carregando';
  var envioId = '';
  var enviando = false;
  var contador = 0;
  // estado do upload por campo: { situacao: 'enviando' | 'falha', erro, nome }
  var anexos = {};
  var pendentes = {};

  // ---------- estado ----------

  function novoVinculo() {
    return { tipo: '', material: '', secao: '', link: '', arquivo: null, complemento: '' };
  }
  function novaPergunta() {
    return { texto: '', definindo: false, emMaterial: false, material: '', secao: '', curto: '', medio: '', longo: '' };
  }
  function novoEstado() {
    var perguntas = {};
    PERGUNTAS.forEach(function (p) { perguntas[p.chave] = novaPergunta(); });
    return {
      materiais: { link: '', arquivo: null, comeco: '' },
      identificacao: { projeto: '', nome: '', email: '', whatsapp: '', cnpj: '' },
      estagio: { estagio: '', dados: [], link: '' },
      equipe: { opcoes: [], complemento: '' },
      historico: { opcoes: [], complemento: '' },
      marca: { identidade: '', estrategia: '', vinculos: { identidade: novoVinculo(), estrategia: novoVinculo() } },
      perguntas: perguntas,
      concorrentes: { nenhum: false, lista: [''] }
    };
  }

  function simples(v) { return v && typeof v === 'object' && !Array.isArray(v); }
  // copia o que foi salvo por cima do estado novo, mantendo só chaves conhecidas
  function mesclar(base, salvo) {
    if (!simples(salvo)) return base;
    Object.keys(base).forEach(function (k) {
      if (!(k in salvo)) return;
      if (simples(base[k])) base[k] = mesclar(base[k], salvo[k]);
      else if (Array.isArray(base[k])) { if (Array.isArray(salvo[k])) base[k] = salvo[k].slice(); }
      else if (base[k] === null) base[k] = simples(salvo[k]) ? salvo[k] : null;
      else if (typeof salvo[k] === typeof base[k]) base[k] = salvo[k];
    });
    return base;
  }

  function ler(caminho) {
    return caminho.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, estado);
  }
  function gravar(caminho, valor) {
    var partes = caminho.split('.');
    var alvo = partes.slice(0, -1).reduce(function (o, k) { return o[k]; }, estado);
    alvo[partes[partes.length - 1]] = valor;
  }

  function salvar() {
    try { sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify({ estado: estado, etapa: etapa, envioId: envioId })); } catch (e) { /* sessão indisponível */ }
  }
  function lerSessao() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE_SESSAO) || 'null') || {}; } catch (e) { return {}; }
  }
  function limparSessao() {
    try { sessionStorage.removeItem(CHAVE_SESSAO); } catch (e) { /* sessão indisponível */ }
  }

  function novoId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
  }

  function anunciar(texto) {
    var el = form.querySelector('[data-anuncio]');
    el.textContent = '';
    setTimeout(function () { el.textContent = texto; }, 50);
  }

  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------- links ----------

  function linkValido(valor) {
    try {
      var url = new URL(valor);
      return /^https?:$/.test(url.protocol) && url.hostname.indexOf('.') > 0;
    } catch (e) {
      return false;
    }
  }
  // quem cola "drive.google.com/..." sem o https:// não precisa refazer
  function completarLink(valor) {
    var v = valor.trim();
    if (v && !/^[a-z][a-z0-9+.-]*:/i.test(v) && /^[\w-]+(\.[\w-]+)+/.test(v)) return 'https://' + v;
    return v;
  }

  // ---------- campos e escolhas ----------

  // os grupos vêm no HTML como <span>opção</span>; aqui viram radio ou checkbox
  // nativos dentro de <label>, com o valor no texto ou em data-valor
  function montarEscolhas(raiz) {
    raiz.querySelectorAll('[data-escolha]').forEach(function (grupo) {
      var nome = 'pw-' + grupo.dataset.escolha.replace(/\W+/g, '-');
      grupo.querySelectorAll(':scope > span').forEach(function (span) {
        var label = document.createElement('label');
        label.className = 'pw-opcao';
        var input = document.createElement('input');
        input.type = grupo.dataset.tipo;
        input.name = nome;
        input.value = span.dataset.valor || span.textContent.trim();
        var texto = document.createElement('span');
        texto.textContent = span.textContent.trim();
        label.appendChild(input);
        label.appendChild(texto);
        span.replaceWith(label);
      });
    });
  }

  function preencher(raiz) {
    raiz.querySelectorAll('[data-campo]').forEach(function (el) {
      var v = ler(el.dataset.campo);
      el.value = v == null ? '' : v;
    });
    raiz.querySelectorAll('[data-campo-bool]').forEach(function (el) {
      el.checked = ler(el.dataset.campoBool) === true;
    });
    raiz.querySelectorAll('[data-escolha]').forEach(function (grupo) {
      var v = ler(grupo.dataset.escolha);
      grupo.querySelectorAll('input').forEach(function (input) {
        input.checked = Array.isArray(v) ? v.indexOf(input.value) !== -1 : v === true || v === input.value;
      });
    });
  }

  function aoEscolher(input) {
    var grupo = input.closest('[data-escolha]');
    var caminho = grupo.dataset.escolha;

    if (grupo.dataset.tipo === 'radio') {
      gravar(caminho, input.value);
    } else if (grupo.hasAttribute('data-sozinha')) {
      gravar(caminho, input.checked);
    } else {
      // a opção de ausência ("Ainda não medimos", "Atuo sozinho", "Nenhum
      // destes") desmarca as outras, e qualquer outra a desmarca
      var exclusiva = grupo.dataset.exclusiva;
      if (exclusiva && input.checked) {
        grupo.querySelectorAll('input').forEach(function (outro) {
          if (outro !== input && (input.value === exclusiva || outro.value === exclusiva)) outro.checked = false;
        });
      }
      gravar(caminho, Array.prototype.filter.call(grupo.querySelectorAll('input'), function (i) { return i.checked; })
        .map(function (i) { return i.value; }));
    }

    if (caminho === 'marca.identidade') renderVinculo('identidade', input);
    if (caminho === 'marca.estrategia') renderVinculo('estrategia', input);
    var vinculo = caminho.match(/^marca\.vinculos\.(\w+)\.tipo$/);
    if (vinculo) renderVinculo(vinculo[1], input);
    if (caminho === 'concorrentes.nenhum') atualizarConcorrentes();
  }

  form.addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.campo) {
      gravar(el.dataset.campo, el.value);
      limparErro(el.closest('.pw-campo'));
      limparErro(el.closest('[data-erro-de]'));
      salvar();
    }
  });

  form.addEventListener('change', function (e) {
    var el = e.target;
    if (el.closest('[data-escolha]')) {
      aoEscolher(el);
      limparErro(el.closest('[data-erro-de]'));
      salvar();
    } else if (el.dataset.campoBool) {
      aoMarcarModo(el);
      salvar();
    }
  });

  // completa o https:// ao sair de um campo de link
  form.addEventListener('focusout', function (e) {
    var el = e.target;
    if (!el.hasAttribute || !el.hasAttribute('data-link')) return;
    var completo = completarLink(el.value);
    if (completo !== el.value) {
      el.value = completo;
      gravar(el.dataset.campo, completo);
      salvar();
    }
  });

  // ---------- erros junto aos campos ----------

  function limparErro(alvo) {
    if (!alvo) return;
    var erro = alvo.querySelector(':scope > .pw-erro[data-erro-gerado]');
    if (erro) erro.remove();
    alvo.querySelectorAll('[aria-invalid]').forEach(function (el) {
      el.removeAttribute('aria-invalid');
      var desc = (el.getAttribute('aria-describedby') || '').split(' ').filter(function (id) { return id.indexOf('pw-erro-') !== 0; });
      if (desc.length) el.setAttribute('aria-describedby', desc.join(' '));
      else el.removeAttribute('aria-describedby');
    });
  }

  function mostrarErro(alvo, mensagem) {
    limparErro(alvo);
    var id = 'pw-erro-' + (++contador);
    var p = document.createElement('p');
    p.className = 'pw-erro';
    p.id = id;
    p.setAttribute('data-erro-gerado', '');
    p.textContent = mensagem;
    alvo.appendChild(p);
    alvo.querySelectorAll('input:not([type="file"]), select, textarea').forEach(function (el) {
      el.setAttribute('aria-invalid', 'true');
      el.setAttribute('aria-describedby', ((el.getAttribute('aria-describedby') || '') + ' ' + id).trim());
    });
  }

  function campoDe(caminho) {
    var el = form.querySelector('[data-campo="' + caminho + '"]');
    return el && el.closest('.pw-campo');
  }
  function grupoDe(caminho) {
    return form.querySelector('[data-erro-de="' + caminho + '"]');
  }

  // devolve a lista de { alvo, msg } da etapa; vazia quando está tudo certo.
  // `alvo` fica nulo quando a parte dinâmica da etapa ainda não foi montada
  function validar(qual) {
    var erros = [];
    function erro(alvo, msg) { erros.push({ alvo: alvo, msg: msg }); }
    function link(caminho, msg) {
      var v = ler(caminho);
      if (v && !linkValido(v)) erro(campoDe(caminho), msg || 'Use um link completo, como https://drive.google.com/…');
    }
    function anexoEmCurso(caminho) {
      var a = anexos[caminho];
      if (a && a.situacao === 'enviando') erro(form.querySelector('[data-anexo="' + caminho + '"]'), 'Aguarde o envio do PDF terminar.');
    }

    var e = estado;
    if (qual === '1') {
      link('materiais.link', 'Use o link completo da pasta, como https://drive.google.com/…');
      anexoEmCurso('materiais.arquivo');
      if (!e.materiais.link && !e.materiais.arquivo && !(anexos['materiais.arquivo'] && anexos['materiais.arquivo'].situacao === 'enviando')) {
        erro(grupoDe('materiais'), 'Cole o link da pasta ou anexe um PDF para continuar.');
      }
    }
    if (qual === '2') {
      var i = e.identificacao;
      if (!i.projeto.trim()) erro(campoDe('identificacao.projeto'), 'Informe o nome do projeto.');
      if (!i.nome.trim()) erro(campoDe('identificacao.nome'), 'Informe o nome do responsável.');
      if (!EMAIL_RE.test(i.email.trim())) erro(campoDe('identificacao.email'), 'Informe um e-mail válido.');
      var digitos = i.whatsapp.replace(/\D/g, '').length;
      if (digitos < 8 || digitos > 15) erro(campoDe('identificacao.whatsapp'), 'Informe um WhatsApp ou telefone com DDD.');
      if (i.cnpj.trim() && i.cnpj.replace(/\D/g, '').length !== 14) erro(campoDe('identificacao.cnpj'), 'O CNPJ tem 14 dígitos.');
    }
    if (qual === '3') {
      if (!e.estagio.estagio) erro(grupoDe('estagio.estagio'), 'Escolha o estágio atual do projeto.');
      if (!e.estagio.dados.length) erro(grupoDe('estagio.dados'), 'Selecione ao menos uma opção.');
      link('estagio.link');
    }
    if (qual === '4' && !e.equipe.opcoes.length) erro(grupoDe('equipe.opcoes'), 'Selecione ao menos uma opção.');
    if (qual === '5' && !e.historico.opcoes.length) erro(grupoDe('historico.opcoes'), 'Selecione ao menos uma opção.');
    if (qual === '6a') {
      if (!e.marca.identidade) erro(grupoDe('marca.identidade'), 'Escolha uma opção.');
      if (!e.marca.estrategia) erro(grupoDe('marca.estrategia'), 'Escolha uma opção.');
      Object.keys(ITENS_MARCA).forEach(function (item) {
        if (!itemExiste(item)) return;
        var base = 'marca.vinculos.' + item;
        var v = e.marca.vinculos[item];
        if (!v.tipo) erro(grupoDe(base + '.tipo'), 'Indique onde encontramos esse material.');
        if (v.tipo === 'outro') {
          link(base + '.link');
          anexoEmCurso(base + '.arquivo');
        }
      });
    }
    if (qual === '6b') {
      PERGUNTAS.forEach(function (p) {
        var r = e.perguntas[p.chave];
        var alvo = grupoDe('perguntas.' + p.chave);
        if (r.emMaterial && !r.material.trim()) {
          erro(alvo, materiaisDisponiveis().length ? 'Escolha o material ou desmarque “Está em um material”.' : 'Diga qual é o material e onde encontrar.');
        } else if (!p.opcional && !temResposta(r)) {
          erro(alvo, 'Responda, indique um material ou marque “Ainda estamos definindo”.');
        }
      });
    }
    if (qual === '7') {
      var algum = e.concorrentes.lista.some(function (c) { return c.trim(); });
      if (!e.concorrentes.nenhum && !algum) erro(grupoDe('concorrentes'), 'Informe um concorrente ou marque “Ainda não identificamos”.');
    }
    return erros;
  }

  function temResposta(r) {
    return Boolean(r.texto.trim() || r.curto.trim() || r.medio.trim() || r.longo.trim() || r.definindo || (r.emMaterial && r.material.trim()));
  }

  function exibirErros(erros) {
    erros = erros.filter(function (e) { return e.alvo; });
    if (!erros.length) return;
    erros.forEach(function (e) { mostrarErro(e.alvo, e.msg); });
    var primeiro = erros[0].alvo.querySelector('input:not([type="file"]):not(:disabled), select, textarea, button');
    if (primeiro) primeiro.focus();
    anunciar(erros.length === 1 ? erros[0].msg : 'Há ' + erros.length + ' campos para revisar nesta etapa.');
  }

  // ---------- navegação ----------

  function irPara(nova) {
    form.querySelectorAll('.pw-etapa').forEach(function (s) {
      s.classList.toggle('is-active', s.dataset.etapa === nova);
    });
    etapa = nova;
    document.body.dataset.etapa = nova;
    if (nova === '6a') { renderVinculo('identidade'); renderVinculo('estrategia'); }
    if (nova === '6b') renderPerguntas();
    if (nova === '7') renderConcorrentes();
    if (ORDEM.indexOf(nova) !== -1) salvar();

    var n = ORDEM.indexOf(nova);
    document.title = (n > 0 ? 'Etapa ' + (nova.charAt(0)) + ' de 7 · ' : '') + 'Pré-Work | FIHAN';
    window.scrollTo(0, 0);
    var titulo = form.querySelector('.pw-etapa.is-active .pw-titulo');
    if (titulo) titulo.focus({ preventScroll: true });
  }

  function avancar() {
    if (etapa === 'inicio') return irPara('1');
    var erros = validar(etapa);
    if (erros.length) return exibirErros(erros);
    var proxima = ORDEM[ORDEM.indexOf(etapa) + 1];
    if (proxima) irPara(proxima);
  }
  function voltar() {
    var anterior = ORDEM[ORDEM.indexOf(etapa) - 1];
    if (anterior) irPara(anterior);
  }

  form.addEventListener('click', function (e) {
    var alvo = e.target.closest('button');
    if (!alvo) return;
    if (alvo.hasAttribute('data-avancar')) avancar();
    else if (alvo.hasAttribute('data-voltar')) voltar();
    else if (alvo.hasAttribute('data-recarregar')) location.reload();
    else if (alvo.hasAttribute('data-concorrente-adicionar')) adicionarConcorrente();
    else if (alvo.dataset.concorrenteRemover) removerConcorrente(Number(alvo.dataset.concorrenteRemover));
  });

  // Enter num campo de uma linha avança a etapa em vez de enviar o formulário
  form.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || e.target.tagName !== 'INPUT' || e.target.type === 'checkbox' || e.target.type === 'radio') return;
    e.preventDefault();
    if (etapa !== '7') avancar();
  });

  // ---------- anexos (PDF) ----------

  function montarAnexos(raiz) {
    raiz.querySelectorAll('[data-anexo]').forEach(function (el) {
      if (el.dataset.montado) return atualizarAnexo(el.dataset.anexo);
      el.dataset.montado = '1';
      var id = 'pw-arquivo-' + (++contador);
      el.innerHTML =
        '<input class="pw-sr" type="file" accept="application/pdf,.pdf" id="' + id + '" tabindex="-1" aria-hidden="true" />' +
        '<button class="pw-btn pw-btn--secundario" type="button" data-anexo-escolher>' + esc(el.dataset.anexoRotulo || 'Anexar PDF') + '</button>' +
        '<div class="pw-anexo__arquivo" data-anexo-caixa hidden>' +
          '<span class="pw-anexo__nome" data-anexo-nome></span>' +
          '<span class="pw-anexo__acoes">' +
            '<button class="pw-link" type="button" data-anexo-tentar hidden>Tentar de novo</button>' +
            '<button class="pw-link" type="button" data-anexo-trocar>Substituir</button>' +
            '<button class="pw-link" type="button" data-anexo-remover>Remover</button>' +
          '</span>' +
        '</div>' +
        '<p class="pw-dica">PDF de até 3 MB.</p>' +
        '<p class="pw-erro" data-anexo-erro role="alert" hidden></p>';

      var caminho = el.dataset.anexo;
      var input = el.querySelector('input[type="file"]');
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) escolherArquivo(caminho, input.files[0]);
        input.value = '';
      });
      el.querySelector('[data-anexo-escolher]').addEventListener('click', function () { input.click(); });
      el.querySelector('[data-anexo-trocar]').addEventListener('click', function () { input.click(); });
      el.querySelector('[data-anexo-tentar]').addEventListener('click', function () { enviarArquivo(caminho); });
      el.querySelector('[data-anexo-remover]').addEventListener('click', function () {
        delete pendentes[caminho];
        delete anexos[caminho];
        gravar(caminho, null);
        salvar();
        atualizarAnexo(caminho);
        el.querySelector('[data-anexo-escolher]').focus();
        anunciar('PDF removido.');
      });
      atualizarAnexo(caminho);
    });
  }

  function atualizarAnexo(caminho) {
    var el = form.querySelector('[data-anexo="' + caminho + '"]');
    if (!el || !el.dataset.montado) return;
    var arquivo = ler(caminho);
    var a = anexos[caminho] || {};
    var caixa = el.querySelector('[data-anexo-caixa]');
    var nome = el.querySelector('[data-anexo-nome]');
    var erro = el.querySelector('[data-anexo-erro]');
    var emCurso = a.situacao === 'enviando';
    var falhou = a.situacao === 'falha';

    caixa.hidden = !(emCurso || falhou || arquivo);
    el.querySelector('[data-anexo-escolher]').hidden = !caixa.hidden;
    caixa.classList.toggle('is-falha', falhou);
    nome.textContent = emCurso ? 'Enviando · ' + a.nome + '…'
      : falhou ? 'Não enviado · ' + a.nome
      : arquivo ? 'Arquivo anexado · ' + arquivo.nome : '';
    el.querySelector('[data-anexo-tentar]').hidden = !falhou;
    el.querySelector('[data-anexo-trocar]').hidden = emCurso;
    el.querySelector('[data-anexo-trocar]').textContent = falhou ? 'Escolher outro' : 'Substituir';
    el.querySelector('[data-anexo-remover]').hidden = emCurso;
    el.setAttribute('aria-busy', emCurso ? 'true' : 'false');
    erro.hidden = !a.erro;
    erro.textContent = a.erro || '';
  }

  function escolherArquivo(caminho, arquivo) {
    var erro = '';
    if (!(arquivo.type === 'application/pdf' || /\.pdf$/i.test(arquivo.name))) erro = 'Envie o arquivo em PDF.';
    else if (!arquivo.size) erro = 'O arquivo está vazio.';
    else if (arquivo.size > MAX_PDF) erro = 'O PDF passa de 3 MB. Envie um arquivo menor ou use o link da pasta.';
    if (erro) {
      // o anexo anterior, se houver, continua valendo
      anexos[caminho] = { erro: erro };
      atualizarAnexo(caminho);
      return;
    }
    pendentes[caminho] = arquivo;
    enviarArquivo(caminho);
  }

  function lerBase64(arquivo) {
    return new Promise(function (resolve, reject) {
      var leitor = new FileReader();
      leitor.onload = function () { resolve(String(leitor.result).split(',')[1] || ''); };
      leitor.onerror = function () { reject(leitor.error); };
      leitor.readAsDataURL(arquivo);
    });
  }

  function enviarArquivo(caminho) {
    var arquivo = pendentes[caminho];
    if (!arquivo) return;
    anexos[caminho] = { situacao: 'enviando', nome: arquivo.name };
    atualizarAnexo(caminho);
    anunciar('Enviando ' + arquivo.name + '.');
    var limparErroDoGrupo = function () {
      var el = form.querySelector('[data-anexo="' + caminho + '"]');
      limparErro(el && el.closest('[data-erro-de]'));
      limparErro(el);
    };

    lerBase64(arquivo)
      .then(function (base64) {
        return fetch('/api/pre-work', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acao: 'upload', token: token, nome: arquivo.name, mime: 'application/pdf', base64: base64 })
        });
      })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (dados) { return { res: res, dados: dados }; });
      })
      .then(function (r) {
        if (pendentes[caminho] !== arquivo) return; // trocado ou removido no meio do envio
        if (!r.res.ok) {
          var falha = new Error(r.dados.error || 'Não foi possível enviar o PDF.');
          // erro de formato ou tamanho não melhora com nova tentativa
          falha.definitiva = r.res.status >= 400 && r.res.status < 500;
          throw falha;
        }
        delete pendentes[caminho];
        delete anexos[caminho];
        gravar(caminho, r.dados.arquivo);
        salvar();
        atualizarAnexo(caminho);
        limparErroDoGrupo();
        anunciar('PDF anexado: ' + r.dados.arquivo.nome + '.');
      })
      .catch(function (err) {
        if (pendentes[caminho] !== arquivo) return;
        if (err.definitiva) {
          delete pendentes[caminho];
          anexos[caminho] = { erro: err.message };
        } else {
          anexos[caminho] = { situacao: 'falha', nome: arquivo.name, erro: (err.message && !(err instanceof TypeError) ? err.message : 'A conexão falhou.') + ' Tente de novo.' };
        }
        atualizarAnexo(caminho);
      });
  }

  // ---------- 6A · vínculo com materiais ----------

  function temMaterial() {
    return Boolean(estado.materiais.link || estado.materiais.arquivo);
  }
  function itemExiste(item) {
    return ITENS_MARCA[item].existentes.indexOf(ler(ITENS_MARCA[item].campo)) !== -1;
  }

  // `origem` é o input que disparou a mudança; o foco volta para ele depois
  // que o bloco é refeito
  function renderVinculo(item, origem) {
    var box = form.querySelector('[data-vinculo="' + item + '"]');
    var base = 'marca.vinculos.' + item;
    var v = estado.marca.vinculos[item];
    var foco = origem && box.contains(origem) ? { name: origem.name, value: origem.value } : null;

    if (!itemExiste(item)) {
      box.innerHTML = '';
      box.hidden = true;
      return;
    }
    // sem material na etapa 1 a opção de reutilizar some
    if (v.tipo === 'etapa1' && !temMaterial()) v.tipo = '';
    var m = estado.materiais;
    if (v.tipo === 'etapa1') {
      if (m.link && !m.arquivo) v.material = 'link';
      else if (m.arquivo && !m.link) v.material = 'arquivo';
      else if (['link', 'arquivo'].indexOf(v.material) === -1) v.material = '';
    }

    var html =
      '<fieldset class="pw-grupo pw-vinculo" data-erro-de="' + base + '.tipo">' +
        '<legend class="pw-pergunta">' + ITENS_MARCA[item].titulo +
          ' <span class="pw-legenda-dica pw-legenda-dica--mono">' + (temMaterial() ? 'Se já compartilhou, indique onde encontrar.' : 'Indique se existe um documento.') + '</span>' +
        '</legend>' +
        '<div class="pw-opcoes pw-opcoes--lista" data-escolha="' + base + '.tipo" data-tipo="radio">' +
          (temMaterial() ? '<span data-valor="etapa1">Já compartilhei na etapa 1</span>' : '') +
          '<span data-valor="outro">Está em outro material</span>' +
          '<span data-valor="sem-documento">Ainda não tenho o documento</span>' +
        '</div>' +
      '</fieldset>';

    if (v.tipo === 'etapa1') {
      if (m.link && m.arquivo) {
        html +=
          '<fieldset class="pw-grupo pw-vinculo__detalhe">' +
            '<legend class="pw-legenda-dica pw-legenda-dica--mono">Qual material? (opcional)</legend>' +
            '<div class="pw-opcoes pw-opcoes--lista" data-escolha="' + base + '.material" data-tipo="radio">' +
              '<span data-valor="arquivo">PDF · ' + esc(m.arquivo.nome) + '</span>' +
              '<span data-valor="link">Link da pasta · ' + esc(m.link) + '</span>' +
            '</div>' +
          '</fieldset>';
      } else {
        html += '<p class="pw-legenda-dica pw-legenda-dica--mono pw-vinculo__detalhe">Material: ' + esc(m.arquivo ? m.arquivo.nome : m.link) + '</p>';
      }
      html += campoHtml(base + '.secao', 'Página ou seção (opcional)');
    }
    if (v.tipo === 'outro') {
      html += campoHtml(base + '.link', 'Link do material (opcional)', 'url');
      html += '<div class="pw-anexo" data-anexo="' + base + '.arquivo" data-anexo-rotulo="Anexar PDF (opcional)"></div>';
    }
    if (v.tipo === 'sem-documento') {
      html += campoHtml(base + '.complemento', 'Complemento (opcional)', 'text', 'Conte o que já existe, mesmo sem documento');
    }

    box.hidden = false;
    box.innerHTML = '<div class="pw-vinculo__corpo">' + html + '</div>';
    montarEscolhas(box);
    montarAnexos(box);
    preencher(box);
    if (foco) {
      var alvo = box.querySelector('input[name="' + foco.name + '"][value="' + foco.value + '"]');
      if (alvo) alvo.focus();
    }
  }

  function campoHtml(caminho, rotulo, tipo, placeholder) {
    var id = 'pw-c-' + caminho.replace(/\W+/g, '-');
    return '<div class="pw-campo">' +
      '<label for="' + id + '">' + esc(rotulo) + '</label>' +
      '<input id="' + id + '" type="' + (tipo || 'text') + '"' +
        (tipo === 'url' ? ' inputmode="url" data-link placeholder="https://"' : '') +
        (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '') +
        ' data-campo="' + caminho + '" />' +
    '</div>';
  }

  // ---------- 6B · perguntas de marca ----------

  // materiais que o cliente já indicou, para as respostas apontarem para eles
  function materiaisDisponiveis() {
    var lista = [];
    var m = estado.materiais;
    if (m.link) lista.push('Link da pasta · ' + m.link);
    if (m.arquivo) lista.push('PDF · ' + m.arquivo.nome);
    Object.keys(ITENS_MARCA).forEach(function (item) {
      var v = estado.marca.vinculos[item];
      if (!itemExiste(item) || v.tipo !== 'outro') return;
      if (v.link) lista.push('Material de marca · ' + v.link);
      if (v.arquivo) lista.push('PDF · ' + v.arquivo.nome);
    });
    return lista.filter(function (x, i) { return lista.indexOf(x) === i; });
  }

  function renderPerguntas() {
    var ol = form.querySelector('[data-perguntas]');
    var materiais = materiaisDisponiveis();

    ol.innerHTML = PERGUNTAS.map(function (p, n) {
      var r = estado.perguntas[p.chave];
      // material que deixou de existir sai da resposta
      if (r.emMaterial && materiais.length && r.material && materiais.indexOf(r.material) === -1) r.material = '';
      var base = 'perguntas.' + p.chave;
      var id = 'pw-' + p.chave;
      var texto = typeof p.texto === 'function' ? p.texto() : p.texto;
      var dica = p.dica ? '<p class="pw-legenda-dica" id="' + id + '-dica">' + esc(p.dica) + '</p>' : '';
      var descr = p.dica ? ' aria-describedby="' + id + '-dica"' : '';

      var resposta = p.metas
        ? '<div class="pw-metas">' +
            [['curto', 'Curto prazo'], ['medio', 'Médio prazo'], ['longo', 'Longo prazo']].map(function (par) {
              return '<div class="pw-campo"><label for="' + id + '-' + par[0] + '">' + par[1] + '</label>' +
                '<input id="' + id + '-' + par[0] + '" type="text" data-campo="' + base + '.' + par[0] + '" /></div>';
            }).join('') +
          '</div>'
        : '<textarea id="' + id + '" rows="2" placeholder="' + (p.opcional ? 'Links ou referências' : 'Resposta ou referência ao material') + '" data-campo="' + base + '.texto"' + descr + '></textarea>';

      var titulo = p.metas
        ? '<p class="pw-pergunta" id="' + id + '-titulo">' + (n + 1) + '. ' + esc(texto) + '</p>'
        : '<label class="pw-pergunta" for="' + id + '">' + (n + 1) + '. ' + esc(texto) + (p.opcional ? ' (opcional)' : '') + '</label>';

      var material = materiais.length
        ? '<div class="pw-campo"><label for="' + id + '-material">Qual material?</label>' +
            '<select id="' + id + '-material" data-campo="' + base + '.material"><option value="">Escolha o material</option>' +
            materiais.map(function (x) { return '<option value="' + esc(x) + '">' + esc(x) + '</option>'; }).join('') +
            '</select></div>' +
          '<div class="pw-campo"><label for="' + id + '-secao">Página ou seção (opcional)</label>' +
            '<input id="' + id + '-secao" type="text" data-campo="' + base + '.secao" /></div>'
        : '<div class="pw-campo"><label for="' + id + '-material">Qual material e onde encontrar?</label>' +
            '<input id="' + id + '-material" type="text" placeholder="Ex.: apresentação institucional, página 4" data-campo="' + base + '.material" /></div>';

      return '<li class="pw-pergunta-item" data-pergunta="' + p.chave + '" data-erro-de="' + base + '"' +
          (p.metas ? ' role="group" aria-labelledby="' + id + '-titulo"' : '') + '>' +
          titulo + dica + resposta +
          '<div class="pw-modos" role="group" aria-label="Outras formas de responder à pergunta ' + (n + 1) + '">' +
            '<label class="pw-modo"><input type="checkbox" data-campo-bool="' + base + '.emMaterial" /><span>Está em um material</span></label>' +
            '<label class="pw-modo"><input type="checkbox" data-campo-bool="' + base + '.definindo" /><span>Ainda estamos definindo</span></label>' +
          '</div>' +
          '<div class="pw-pergunta__material" data-material-de="' + p.chave + '"' + (r.emMaterial ? '' : ' hidden') + '>' + material + '</div>' +
        '</li>';
    }).join('');
    preencher(ol);
  }

  // "Está em um material" e "Ainda estamos definindo" são formas de resposta
  // que se excluem; o texto escrito continua valendo junto com qualquer uma
  function aoMarcarModo(input) {
    var partes = input.dataset.campoBool.split('.');
    var chave = partes[1];
    var r = estado.perguntas[chave];
    r[partes[2]] = input.checked;
    var item = form.querySelector('[data-pergunta="' + chave + '"]');
    if (input.checked) {
      var outro = partes[2] === 'emMaterial' ? 'definindo' : 'emMaterial';
      r[outro] = false;
      item.querySelector('[data-campo-bool="perguntas.' + chave + '.' + outro + '"]').checked = false;
    }
    if (!r.emMaterial) {
      r.material = '';
      r.secao = '';
      item.querySelectorAll('[data-material-de] [data-campo]').forEach(function (el) { el.value = ''; });
    }
    item.querySelector('[data-material-de]').hidden = !r.emMaterial;
    limparErro(item);
  }

  // ---------- 7 · concorrentes ----------

  function renderConcorrentes(focar) {
    var lista = form.querySelector('[data-concorrentes-lista]');
    var itens = estado.concorrentes.lista;
    if (!itens.length) itens.push('');
    lista.innerHTML = itens.map(function (valor, i) {
      var id = 'pw-concorrente-' + i;
      return '<div class="pw-concorrente">' +
        '<div class="pw-campo">' +
          '<label for="' + id + '">' + (i === 0 ? 'Nome, link ou lista existente' : 'Outro nome ou link') + '</label>' +
          '<input id="' + id + '" type="text" data-campo="concorrentes.lista.' + i + '" />' +
        '</div>' +
        (itens.length > 1 ? '<button class="pw-link" type="button" data-concorrente-remover="' + i + '" aria-label="Remover alternativa ' + (i + 1) + '">Remover</button>' : '') +
      '</div>';
    }).join('');
    preencher(lista);
    atualizarConcorrentes();
    if (focar != null) {
      var alvo = lista.querySelector('#pw-concorrente-' + focar) || form.querySelector('[data-concorrente-adicionar]');
      alvo.focus();
    }
  }

  function atualizarConcorrentes() {
    var nenhum = estado.concorrentes.nenhum;
    form.querySelector('[data-concorrentes]').disabled = nenhum;
    form.querySelector('[data-concorrente-adicionar]').hidden = estado.concorrentes.lista.length >= MAX_CONCORRENTES;
  }

  function adicionarConcorrente() {
    if (estado.concorrentes.lista.length >= MAX_CONCORRENTES) return;
    estado.concorrentes.lista.push('');
    salvar();
    renderConcorrentes(estado.concorrentes.lista.length - 1);
  }
  function removerConcorrente(i) {
    estado.concorrentes.lista.splice(i, 1);
    salvar();
    renderConcorrentes(Math.max(0, i - 1));
    anunciar('Alternativa removida.');
  }

  // ---------- envio ----------

  function respostas() {
    var copia = JSON.parse(JSON.stringify(estado));
    copia.concorrentes.lista = copia.concorrentes.lista.map(function (c) { return c.trim(); }).filter(Boolean);
    Object.keys(copia.perguntas).forEach(function (k) { delete copia.perguntas[k].emMaterial; });
    return copia;
  }

  var botaoEnviar = form.querySelector('[data-enviar]');
  var rotuloEnviar = form.querySelector('[data-enviar-rotulo]');
  var erroEnvio = form.querySelector('[data-erro-envio]');

  function terminarEnvio(mensagem) {
    enviando = false;
    botaoEnviar.disabled = false;
    botaoEnviar.removeAttribute('aria-busy');
    rotuloEnviar.textContent = 'Enviar Pré-Work';
    erroEnvio.textContent = mensagem;
    erroEnvio.hidden = !mensagem;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (enviando || etapa !== '7') return;

    // confere todas as etapas; uma falha leva de volta à etapa dela, que é
    // montada de novo antes de mostrar os erros
    for (var i = 1; i < ORDEM.length; i++) {
      if (validar(ORDEM[i]).length) {
        if (ORDEM[i] !== etapa) irPara(ORDEM[i]);
        exibirErros(validar(ORDEM[i]));
        return;
      }
    }

    enviando = true;
    botaoEnviar.disabled = true;
    botaoEnviar.setAttribute('aria-busy', 'true');
    rotuloEnviar.textContent = 'Enviando…';
    erroEnvio.hidden = true;
    // o mesmo id em todas as tentativas: se a primeira chegou e só a resposta
    // se perdeu, a nova tentativa não cria outro envio
    if (!envioId) envioId = novoId();
    salvar();

    fetch('/api/pre-work', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acao: 'enviar', token: token, envioId: envioId, respostas: respostas() })
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (dados) {
          if (res.ok || (res.status === 409 && dados.enviado)) {
            enviando = false;
            limparSessao();
            irPara('ok');
            return;
          }
          terminarEnvio((dados.error || 'Não foi possível enviar agora.') + ' Suas respostas continuam aqui.');
        });
      })
      .catch(function () {
        terminarEnvio('A conexão falhou e o Pré-Work não foi enviado. Suas respostas continuam aqui. Tente de novo.');
      });
  });

  // ---------- início ----------

  function linkIndisponivel(titulo, texto, podeTentar) {
    form.querySelector('[data-invalido-titulo]').textContent = titulo;
    if (texto) form.querySelector('[data-invalido-texto]').textContent = texto;
    form.querySelector('[data-invalido-acao]').hidden = !podeTentar;
    form.querySelector('[data-etapa="carregando"]').removeAttribute('aria-busy');
    irPara('invalido');
  }

  function iniciar() {
    montarEscolhas(form);
    montarAnexos(form);

    if (!token) return linkIndisponivel('Não encontramos este Pré-Work');

    var salvo = lerSessao();
    estado = mesclar(novoEstado(), salvo.estado);
    envioId = typeof salvo.envioId === 'string' ? salvo.envioId : '';
    preencher(form);
    atualizarAnexo('materiais.arquivo');

    fetch('/api/pre-work?token=' + encodeURIComponent(token))
      .then(function (res) {
        if (res.status === 404) { limparSessao(); linkIndisponivel('Não encontramos este Pré-Work'); return; }
        if (!res.ok) throw new Error('status ' + res.status);
        return res.json().then(function (dados) {
          form.querySelector('[data-etapa="carregando"]').removeAttribute('aria-busy');
          if (dados.status === 'enviado') { limparSessao(); irPara('ok'); return; }
          // dados do registro comercial entram só onde o cliente ainda não escreveu
          var pre = dados.prefill || {};
          Object.keys(pre).forEach(function (k) {
            if (pre[k] && !estado.identificacao[k]) estado.identificacao[k] = String(pre[k]);
          });
          preencher(form);
          irPara(ORDEM.indexOf(salvo.etapa) !== -1 ? salvo.etapa : 'inicio');
        });
      })
      .catch(function () {
        linkIndisponivel('Não foi possível abrir o Pré-Work agora', 'Verifique a conexão e tente de novo. Suas respostas desta sessão continuam guardadas.', true);
      });
  }

  iniciar();
})();
