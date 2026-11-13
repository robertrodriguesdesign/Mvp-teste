// regras do Pré-Work do cliente: opções aceitas, limpeza e validação do que
// chega do formulário (/pre-work) e o resumo legível usado no e-mail e no admin.
// As opções e perguntas repetem os textos de pre-work/index.html; mudar lá
// pede mudar aqui.

const ESTAGIOS = ['Em preparação', 'Protótipo em teste', 'Piloto com usuários', 'Em operação sem receita', 'Em operação com receita'];
const DADOS = ['Uso', 'Vendas', 'Faturamento', 'Ainda não medimos'];
const EQUIPE = ['Sócios', 'Equipe própria', 'Prestadores recorrentes', 'Parceiros', 'Atuo sozinho'];
const HISTORICO = ['Pesquisa com clientes', 'Teste ou piloto', 'Lançamento', 'Mudança de direção', 'Investimento próprio', 'Captação', 'Participação em programa', 'Nenhum destes'];
const IDENTIDADE = ['Sim, está em uso', 'Está em desenvolvimento', 'Ainda não', 'Não sei informar'];
const ESTRATEGIA = ['Sim', 'Em parte', 'Ainda não', 'Não sei informar'];
// opção que, marcada, desmarca as outras do grupo
const EXCLUSIVAS = { dados: 'Ainda não medimos', equipe: 'Atuo sozinho', historico: 'Nenhum destes' };
const VINCULOS = {
  etapa1: 'Já compartilhei na etapa 1',
  outro: 'Está em outro material',
  'sem-documento': 'Ainda não tenho o documento',
};

const PERGUNTAS = [
  ['q1', 'Qual é o propósito da empresa?'],
  ['q2', 'Quais perfis de clientes a empresa atende hoje?'],
  ['q3', 'Por que vocês escolheram o nome informado na etapa 2?'],
  ['q4', 'Quando a empresa foi fundada e quais marcos ajudam a contar sua história?'],
  ['q5', 'Como vocês se comunicam com esses clientes hoje? Quais canais usam?'],
  ['q6', 'Quais exemplos recentes mostram como vocês se comunicam?'],
  ['q7', 'Quais são os principais desafios da empresa no cenário em que atua?'],
  ['q8', 'Qual é a principal meta da empresa no curto, médio e longo prazo?'],
  ['q9', 'O que vocês esperam que este projeto ajude a resolver?'],
  ['q10', 'Quais marcas inspiram vocês e o que podemos aprender com elas?'],
];
// os exemplos de comunicação ficam opcionais quando não houver exemplos
const PERGUNTAS_OPCIONAIS = ['q6'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONCORRENTES = 12;

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function obj(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

// link http(s) com domínio; devolve '' quando não serve
function linkValido(value) {
  const v = clean(value, 1000);
  if (!v) return '';
  try {
    const url = new URL(v);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return '';
    return url.href;
  } catch {
    return '';
  }
}

function escolha(value, opcoes) {
  return opcoes.includes(value) ? value : '';
}

function escolhas(lista, opcoes, exclusiva) {
  const marcadas = Array.isArray(lista) ? opcoes.filter((o) => lista.includes(o)) : [];
  return exclusiva && marcadas.includes(exclusiva) ? [exclusiva] : marcadas;
}

class ErroValidacao extends Error {}
function exigir(condicao, mensagem) {
  if (!condicao) throw new ErroValidacao(mensagem);
}

// `arquivos` é um Map id -> nome dos PDFs enviados neste pré-work; um anexo
// só vale se estiver nele
function limparArquivo(valor, arquivos) {
  const id = clean(obj(valor).id, 40);
  return id && arquivos.has(id) ? { id, nome: arquivos.get(id) } : null;
}

// link opcional: vazio passa, preenchido precisa ser válido
function linkOpcional(valor, mensagem) {
  const bruto = clean(valor, 1000);
  const link = linkValido(bruto);
  exigir(!bruto || link, mensagem);
  return link;
}

function limparVinculo(valor, temMaterial, arquivos, item) {
  const v = obj(valor);
  const tipo = Object.keys(VINCULOS).includes(v.tipo) ? v.tipo : '';
  exigir(tipo, `Indique onde está ${item} (etapa 6).`);
  exigir(tipo !== 'etapa1' || temMaterial, `Não há material na etapa 1 para ${item}.`);
  const vinculo = { tipo };
  if (tipo === 'etapa1') {
    vinculo.material = ['link', 'arquivo'].includes(v.material) ? v.material : '';
    vinculo.secao = clean(v.secao, 300);
  }
  if (tipo === 'outro') {
    vinculo.link = linkOpcional(v.link, `O link do material sobre ${item} não é válido.`);
    vinculo.arquivo = limparArquivo(v.arquivo, arquivos);
  }
  if (tipo === 'sem-documento') vinculo.complemento = clean(v.complemento, 2000);
  return vinculo;
}

function limparPergunta(chave, valor) {
  const v = obj(valor);
  const resposta = {
    texto: clean(v.texto, 3000),
    definindo: v.definindo === true,
    material: clean(v.material, 300),
    secao: clean(v.secao, 300),
  };
  if (chave === 'q8') {
    resposta.curto = clean(v.curto, 1000);
    resposta.medio = clean(v.medio, 1000);
    resposta.longo = clean(v.longo, 1000);
  }
  // a origem diz à equipe de onde veio a resposta, para aprofundar na reunião
  const temTexto = resposta.texto || resposta.curto || resposta.medio || resposta.longo;
  resposta.origem = resposta.definindo ? 'definindo' : resposta.material ? 'material' : temTexto ? 'texto' : '';
  return resposta;
}

// devolve as respostas só com campos e valores conhecidos; lança
// ErroValidacao com uma mensagem para o cliente quando falta algo obrigatório
function limparRespostas(bruto, arquivos) {
  const r = obj(bruto);

  const m = obj(r.materiais);
  const materiais = {
    link: linkOpcional(m.link, 'O link da pasta não é válido (etapa 1).'),
    arquivo: limparArquivo(m.arquivo, arquivos),
    comeco: clean(m.comeco, 2000),
  };
  exigir(materiais.link || materiais.arquivo, 'Informe o link da pasta ou anexe um PDF (etapa 1).');
  const temMaterial = Boolean(materiais.link || materiais.arquivo);

  const i = obj(r.identificacao);
  const identificacao = {
    projeto: clean(i.projeto, 200),
    nome: clean(i.nome, 200),
    email: clean(i.email, 200),
    whatsapp: clean(i.whatsapp, 40),
    cnpj: clean(i.cnpj, 30),
  };
  exigir(identificacao.projeto && identificacao.nome, 'Preencha o nome do projeto e do responsável (etapa 2).');
  exigir(EMAIL_RE.test(identificacao.email), 'Informe um e-mail válido (etapa 2).');
  exigir(identificacao.whatsapp.replace(/\D/g, '').length >= 8, 'Informe um WhatsApp ou telefone válido (etapa 2).');

  const e = obj(r.estagio);
  const estagio = {
    estagio: escolha(e.estagio, ESTAGIOS),
    dados: escolhas(e.dados, DADOS, EXCLUSIVAS.dados),
    link: linkOpcional(e.link, 'O link para os dados não é válido (etapa 3).'),
  };
  exigir(estagio.estagio, 'Escolha o estágio do projeto (etapa 3).');
  exigir(estagio.dados.length, 'Indique quais dados vocês acompanham (etapa 3).');

  const eq = obj(r.equipe);
  const equipe = { opcoes: escolhas(eq.opcoes, EQUIPE, EXCLUSIVAS.equipe), complemento: clean(eq.complemento, 2000) };
  exigir(equipe.opcoes.length, 'Indique quem trabalha no projeto (etapa 4).');

  const h = obj(r.historico);
  const historico = { opcoes: escolhas(h.opcoes, HISTORICO, EXCLUSIVAS.historico), complemento: clean(h.complemento, 2000) };
  exigir(historico.opcoes.length, 'Indique o que já aconteceu no projeto (etapa 5).');

  const mc = obj(r.marca);
  const marca = {
    identidade: escolha(mc.identidade, IDENTIDADE),
    estrategia: escolha(mc.estrategia, ESTRATEGIA),
    vinculos: {},
  };
  exigir(marca.identidade, 'Responda se vocês já têm uma identidade visual (etapa 6).');
  exigir(marca.estrategia, 'Responda se vocês já têm uma estratégia de marca documentada (etapa 6).');
  const vinculos = obj(mc.vinculos);
  if (IDENTIDADE.indexOf(marca.identidade) < 2) {
    marca.vinculos.identidade = limparVinculo(vinculos.identidade, temMaterial, arquivos, 'a identidade visual');
  }
  if (ESTRATEGIA.indexOf(marca.estrategia) < 2) {
    marca.vinculos.estrategia = limparVinculo(vinculos.estrategia, temMaterial, arquivos, 'a estratégia de marca');
  }

  const p = obj(r.perguntas);
  const perguntas = {};
  PERGUNTAS.forEach(([chave], n) => {
    perguntas[chave] = limparPergunta(chave, p[chave]);
    exigir(
      perguntas[chave].origem || PERGUNTAS_OPCIONAIS.includes(chave),
      `Responda a pergunta ${n + 1} da etapa 6, indique um material ou marque “Ainda estamos definindo”.`
    );
  });

  const c = obj(r.concorrentes);
  const concorrentes = {
    nenhum: c.nenhum === true,
    lista: c.nenhum === true ? [] : (Array.isArray(c.lista) ? c.lista : [])
      .slice(0, MAX_CONCORRENTES)
      .map((x) => clean(x, 500))
      .filter(Boolean),
  };
  exigir(concorrentes.nenhum || concorrentes.lista.length, 'Informe um concorrente ou marque “Ainda não identificamos” (etapa 7).');

  return { materiais, identificacao, estagio, equipe, historico, marca, perguntas, concorrentes };
}

function descreverVinculo(v, materiais) {
  if (!v) return '';
  const partes = [VINCULOS[v.tipo]];
  if (v.tipo === 'etapa1') {
    const qual = v.material === 'arquivo' && materiais.arquivo ? materiais.arquivo.nome
      : v.material === 'link' && materiais.link ? materiais.link
      : (materiais.arquivo ? materiais.arquivo.nome : materiais.link);
    partes.push(qual);
    if (v.secao) partes.push(`página/seção: ${v.secao}`);
  }
  if (v.tipo === 'outro') {
    if (v.link) partes.push(v.link);
    if (v.arquivo) partes.push(`PDF: ${v.arquivo.nome}`);
  }
  if (v.tipo === 'sem-documento' && v.complemento) partes.push(v.complemento);
  return partes.filter(Boolean).join(' · ');
}

function descreverPergunta(chave, r) {
  const linhas = [];
  if (chave === 'q8') {
    if (r.curto) linhas.push(`Curto prazo: ${r.curto}`);
    if (r.medio) linhas.push(`Médio prazo: ${r.medio}`);
    if (r.longo) linhas.push(`Longo prazo: ${r.longo}`);
  }
  if (r.texto) linhas.push(r.texto);
  if (r.material) linhas.push(`[material] ${r.material}${r.secao ? ` · página/seção: ${r.secao}` : ''}`);
  if (r.definindo) linhas.push('[Ainda estamos definindo]');
  return linhas.join('\n');
}

// seções com rótulo e valor, só com o que foi preenchido
function resumir(d) {
  const secao = (titulo, pares) => ({
    titulo,
    itens: pares.filter(([, valor]) => valor).map(([rotulo, valor]) => ({ rotulo, valor })),
  });
  const lista = (v) => (Array.isArray(v) ? v.join(', ') : '');

  return [
    secao('1 · Materiais existentes', [
      ['Link da pasta', d.materiais.link],
      ['PDF', d.materiais.arquivo && d.materiais.arquivo.nome],
      ['Por onde começar', d.materiais.comeco],
    ]),
    secao('2 · Identificação', [
      ['Projeto', d.identificacao.projeto],
      ['Responsável', d.identificacao.nome],
      ['E-mail', d.identificacao.email],
      ['WhatsApp ou telefone', d.identificacao.whatsapp],
      ['CNPJ', d.identificacao.cnpj],
    ]),
    secao('3 · Estágio operacional', [
      ['Estágio', d.estagio.estagio],
      ['Dados acompanhados', lista(d.estagio.dados)],
      ['Link para os dados', d.estagio.link],
    ]),
    secao('4 · Equipe e estrutura', [
      ['Quem trabalha no projeto', lista(d.equipe.opcoes)],
      ['Papéis e aprovações', d.equipe.complemento],
    ]),
    secao('5 · Histórico', [
      ['O que já aconteceu', lista(d.historico.opcoes)],
      ['Link ou resultado registrado', d.historico.complemento],
    ]),
    secao('6 · Sobre a marca', [
      ['Identidade visual', d.marca.identidade],
      ['Onde está a identidade', descreverVinculo(d.marca.vinculos.identidade, d.materiais)],
      ['Estratégia de marca documentada', d.marca.estrategia],
      ['Onde está a estratégia', descreverVinculo(d.marca.vinculos.estrategia, d.materiais)],
    ]),
    secao('6 · Perguntas de marca (respostas declaradas, insumo da Descoberta)', PERGUNTAS.map(([chave, texto], n) => [
      `${n + 1}. ${chave === 'q3' && d.identificacao.projeto ? `Por que vocês escolheram o nome “${d.identificacao.projeto}”?` : texto}`,
      descreverPergunta(chave, d.perguntas[chave]),
    ])),
    secao('7 · Concorrentes conhecidos', [
      ['Concorrentes', d.concorrentes.nenhum ? 'Ainda não identificamos' : d.concorrentes.lista.join('\n')],
    ]),
  ];
}

module.exports = { limparRespostas, resumir, ErroValidacao };
