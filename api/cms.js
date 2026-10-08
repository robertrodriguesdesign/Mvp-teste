// CRUD dos projetos e posts do blog — só para o admin logado
const crypto = require('crypto');
const { getClient, ensureSchema } = require('./_db');
const { isAdmin } = require('./_auth');
const { renderProjeto, renderPost, safeUrl } = require('./_render');

const TIPOS = ['projeto', 'post'];
// páginas de projeto que já existem como arquivo em /trabalhos — o arquivo
// tem prioridade na Vercel, então um conteúdo com o mesmo endereço nunca
// apareceria
const SLUGS_RESERVADOS = {
  projeto: ['routes', 'makers', 'ciclos-system', 'brain', 'auati', 'zei', 'index'],
  post: ['index'],
};
const MIMES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_IMAGEM = 3 * 1024 * 1024;

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function slugify(value) {
  return clean(value, 120)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function pares(lista, a, b, maxItens) {
  if (!Array.isArray(lista)) return [];
  return lista
    .slice(0, maxItens)
    .map((item) => ({ [a]: clean(item && item[a], 200), [b]: clean(item && item[b], 1500) }))
    .filter((item) => item[a] || item[b]);
}

// guarda só os campos conhecidos de cada tipo
function limparDados(tipo, dados) {
  const d = dados && typeof dados === 'object' ? dados : {};
  if (tipo === 'post') {
    return {
      corpo: clean(d.corpo, 60000),
      autor: clean(d.autor, 120),
      seoDescricao: clean(d.seoDescricao, 300),
    };
  }
  return {
    lede: clean(d.lede, 400),
    ficha: pares(d.ficha, 'rotulo', 'valor', 6),
    problemaTitulo: clean(d.problemaTitulo, 300),
    problemaTexto: clean(d.problemaTexto, 6000),
    devTitulo: clean(d.devTitulo, 300),
    etapas: pares(d.etapas, 'titulo', 'texto', 12),
    solucaoTitulo: clean(d.solucaoTitulo, 300),
    itens: pares(d.itens, 'titulo', 'texto', 12),
    tecnica: clean(d.tecnica, 4000),
    linkRotulo: clean(d.linkRotulo, 80),
    linkUrl: safeUrl(clean(d.linkUrl, 500)),
    seoDescricao: clean(d.seoDescricao, 300),
  };
}

function linha(row, comDados) {
  const item = {
    id: row.id,
    tipo: row.tipo,
    slug: row.slug,
    status: row.status,
    titulo: row.titulo,
    resumo: row.resumo || '',
    capa: row.capa || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at,
  };
  if (comDados) {
    try { item.dados = JSON.parse(row.dados || '{}'); } catch { item.dados = {}; }
  }
  return item;
}

async function buscar(id) {
  const rs = await getClient().execute({ sql: 'SELECT * FROM conteudos WHERE id = ?', args: [Number(id)] });
  return rs.rows[0] ? linha(rs.rows[0], true) : null;
}

async function salvar(body, res) {
  const tipo = body.tipo;
  if (!TIPOS.includes(tipo)) return res.status(400).json({ error: 'Tipo de conteúdo inválido.' });

  const titulo = clean(body.titulo, 160);
  if (!titulo) return res.status(400).json({ error: 'Informe o título.' });

  const slug = slugify(body.slug || titulo);
  if (!slug) return res.status(400).json({ error: 'Informe um endereço (link) válido.' });
  if (SLUGS_RESERVADOS[tipo].includes(slug)) {
    return res.status(409).json({ error: 'Já existe uma página do site com esse endereço. Escolha outro.' });
  }

  const status = body.status === 'publicado' ? 'publicado' : 'rascunho';
  const resumo = clean(body.resumo, 400);
  const capa = safeUrl(clean(body.capa, 500));
  const dados = limparDados(tipo, body.dados);

  if (status === 'publicado') {
    if (!resumo) return res.status(400).json({ error: 'Para publicar, preencha o resumo.' });
    if (tipo === 'post' && !dados.corpo) return res.status(400).json({ error: 'Para publicar, escreva o texto do artigo.' });
  }

  const db = getClient();
  const id = body.id ? Number(body.id) : null;
  try {
    let savedId = id;
    if (id) {
      // published_at marca a primeira publicação e não muda depois
      const rs = await db.execute({
        sql: `UPDATE conteudos
              SET slug = ?, status = ?, titulo = ?, resumo = ?, capa = ?, dados = ?,
                  updated_at = datetime('now'),
                  published_at = CASE WHEN ? = 'publicado' THEN COALESCE(published_at, datetime('now')) ELSE published_at END
              WHERE id = ? AND tipo = ?`,
        args: [slug, status, titulo, resumo, capa, JSON.stringify(dados), status, id, tipo],
      });
      if (!rs.rowsAffected) return res.status(404).json({ error: 'Conteúdo não encontrado.' });
    } else {
      const rs = await db.execute({
        sql: `INSERT INTO conteudos (tipo, slug, status, titulo, resumo, capa, dados, published_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CASE WHEN ? = 'publicado' THEN datetime('now') END)`,
        args: [tipo, slug, status, titulo, resumo, capa, JSON.stringify(dados), status],
      });
      savedId = Number(rs.lastInsertRowid);
    }
    return res.status(200).json({ ok: true, conteudo: await buscar(savedId) });
  } catch (err) {
    if (/UNIQUE/i.test(String(err && err.message))) {
      return res.status(409).json({ error: 'Já existe um conteúdo com esse endereço. Escolha outro.' });
    }
    throw err;
  }
}

async function upload(body, res) {
  const ext = MIMES[body.mime];
  if (!ext) return res.status(400).json({ error: 'Formato de imagem não aceito. Use JPG, PNG, WebP ou GIF.' });

  const bytes = Buffer.from(String(body.base64 || ''), 'base64');
  if (!bytes.length) return res.status(400).json({ error: 'Imagem vazia.' });
  if (bytes.length > MAX_IMAGEM) return res.status(413).json({ error: 'Imagem grande demais (máximo de 3 MB).' });

  const id = crypto.randomBytes(12).toString('hex');
  await getClient().execute({
    sql: 'INSERT INTO midias (id, mime, bytes) VALUES (?, ?, ?)',
    args: [id, body.mime, bytes],
  });
  return res.status(200).json({ ok: true, url: `/midia/${id}.${ext}` });
}

module.exports = async (req, res) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: 'não autenticado' });
    return;
  }
  res.setHeader('Cache-Control', 'no-store');

  try {
    await ensureSchema();
    const db = getClient();

    if (req.method === 'GET') {
      const { id, previa, tipo } = req.query || {};

      if (previa) {
        const c = await buscar(previa);
        if (!c) { res.status(404).send('Conteúdo não encontrado.'); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(c.tipo === 'post' ? renderPost(c, { previa: true }) : renderProjeto(c, { previa: true }));
        return;
      }
      if (id) {
        const c = await buscar(id);
        if (!c) { res.status(404).json({ error: 'Conteúdo não encontrado.' }); return; }
        res.status(200).json({ conteudo: c });
        return;
      }
      if (!TIPOS.includes(tipo)) { res.status(400).json({ error: 'Tipo de conteúdo inválido.' }); return; }
      const rs = await db.execute({
        sql: `SELECT id, tipo, slug, status, titulo, resumo, capa, created_at, updated_at, published_at
              FROM conteudos WHERE tipo = ? ORDER BY updated_at DESC`,
        args: [tipo],
      });
      res.status(200).json({ conteudos: rs.rows.map((r) => linha(r, false)) });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.acao === 'salvar') { await salvar(body, res); return; }
      if (body.acao === 'upload') { await upload(body, res); return; }
      if (body.acao === 'excluir') {
        await db.execute({ sql: 'DELETE FROM conteudos WHERE id = ?', args: [Number(body.id)] });
        res.status(200).json({ ok: true });
        return;
      }
      res.status(400).json({ error: 'Ação inválida.' });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('cms error:', err);
    res.status(500).json({ error: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
