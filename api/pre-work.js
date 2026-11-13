// Pré-Work do cliente. O lado público (abrir o link, anexar PDF, enviar) só
// funciona com o token do link gerado no admin; gerar o link, ver as
// respostas e baixar os PDFs pede o admin logado.
const crypto = require('crypto');
const { getClient, ensureSchema } = require('./_db');
const { isAdmin } = require('./_auth');
const { notifyPreWork } = require('./_notify');
const { limparRespostas, resumir, ErroValidacao } = require('./_prework');

const SITE = 'https://fihan.com.br';
// mesmo limite de upload do admin (api/cms.js); o corpo em base64 ainda
// precisa caber no limite de 4,5 MB das functions da Vercel
const MAX_PDF = 3 * 1024 * 1024;
const MAX_ARQUIVOS = 10;
const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;
const ENVIO_RE = /^[A-Za-z0-9-]{8,64}$/;
const ARQUIVO_RE = /^[a-f0-9]{24}$/;

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function urlDoToken(token) {
  return `${SITE}/pre-work/${token}`;
}

async function porToken(token) {
  if (!TOKEN_RE.test(String(token || ''))) return null;
  const rs = await getClient().execute({ sql: 'SELECT * FROM pre_works WHERE token = ?', args: [token] });
  return rs.rows[0] || null;
}

async function arquivosDo(preWorkId) {
  const rs = await getClient().execute({
    sql: 'SELECT id, nome, tamanho FROM pre_work_arquivos WHERE pre_work_id = ? ORDER BY created_at',
    args: [preWorkId],
  });
  return rs.rows.map((r) => ({ id: r.id, nome: r.nome, tamanho: Number(r.tamanho) }));
}

// ---------- público ----------

async function abrir(token, res) {
  const pw = await porToken(token);
  if (!pw) return res.status(404).json({ error: 'Link do Pré-Work não encontrado.' });
  if (pw.status === 'enviado') return res.status(200).json({ status: 'enviado' });

  // só os dados de identificação; o contexto comercial do lead fica no admin
  const rs = await getClient().execute({
    sql: 'SELECT nome, email, whatsapp, empresa FROM leads WHERE id = ?',
    args: [pw.lead_id],
  });
  const lead = rs.rows[0] || {};
  return res.status(200).json({
    status: 'pendente',
    prefill: {
      projeto: lead.empresa || '',
      nome: lead.nome || '',
      email: lead.email || '',
      whatsapp: lead.whatsapp || '',
    },
  });
}

async function upload(body, res) {
  const pw = await porToken(body.token);
  if (!pw) return res.status(404).json({ error: 'Link do Pré-Work não encontrado.' });
  if (pw.status !== 'pendente') return res.status(409).json({ error: 'Este Pré-Work já foi enviado.' });

  const base64 = String(body.base64 || '');
  if (base64.length > Math.ceil(MAX_PDF / 3) * 4 + 4) {
    return res.status(413).json({ error: 'O PDF passa de 3 MB. Envie um arquivo menor ou use o link da pasta.' });
  }
  const bytes = Buffer.from(base64, 'base64');
  if (!bytes.length) return res.status(400).json({ error: 'O arquivo está vazio.' });
  if (bytes.length > MAX_PDF) {
    return res.status(413).json({ error: 'O PDF passa de 3 MB. Envie um arquivo menor ou use o link da pasta.' });
  }
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') {
    return res.status(415).json({ error: 'O arquivo não é um PDF.' });
  }

  const db = getClient();
  const conta = await db.execute({ sql: 'SELECT COUNT(*) AS n FROM pre_work_arquivos WHERE pre_work_id = ?', args: [pw.id] });
  if (Number(conta.rows[0].n) >= MAX_ARQUIVOS) {
    return res.status(429).json({ error: 'Limite de arquivos atingido. Use o link da pasta para enviar o restante.' });
  }

  const nome = clean(body.nome, 200).replace(/[\\/\r\n]+/g, ' ') || 'arquivo.pdf';
  const id = crypto.randomBytes(12).toString('hex');
  await db.execute({
    sql: 'INSERT INTO pre_work_arquivos (id, pre_work_id, nome, tamanho, bytes) VALUES (?, ?, ?, ?, ?)',
    args: [id, pw.id, nome, bytes.length, bytes],
  });
  return res.status(200).json({ ok: true, arquivo: { id, nome } });
}

function anexosUsados(d) {
  return [
    d.materiais.arquivo,
    d.marca.vinculos.identidade && d.marca.vinculos.identidade.arquivo,
    d.marca.vinculos.estrategia && d.marca.vinculos.estrategia.arquivo,
  ].filter(Boolean).map((a) => a.id);
}

async function enviar(body, res) {
  const pw = await porToken(body.token);
  if (!pw) return res.status(404).json({ error: 'Link do Pré-Work não encontrado.' });

  const envioId = String(body.envioId || '');
  if (!ENVIO_RE.test(envioId)) return res.status(400).json({ error: 'Envio inválido. Recarregue a página e tente de novo.' });
  // o mesmo envio repetido (clique duplo, nova tentativa depois de uma
  // resposta perdida) recebe o mesmo "ok" sem gravar de novo
  if (pw.status === 'enviado') {
    if (pw.envio_id === envioId) return res.status(200).json({ ok: true });
    return res.status(409).json({ error: 'Este Pré-Work já foi enviado.', enviado: true });
  }

  const arquivos = new Map((await arquivosDo(pw.id)).map((a) => [a.id, a.nome]));
  let dados;
  try {
    dados = limparRespostas(body.respostas, arquivos);
  } catch (err) {
    if (err instanceof ErroValidacao) return res.status(400).json({ error: err.message });
    throw err;
  }

  const db = getClient();
  const rs = await db.execute({
    sql: `UPDATE pre_works SET status = 'enviado', envio_id = ?, respostas = ?, enviado_at = datetime('now')
          WHERE id = ? AND status = 'pendente'`,
    args: [envioId, JSON.stringify(dados), pw.id],
  });
  if (!rs.rowsAffected) {
    // outro pedido chegou primeiro; responde conforme quem foi
    const atual = await porToken(body.token);
    if (atual && atual.envio_id === envioId) return res.status(200).json({ ok: true });
    return res.status(409).json({ error: 'Este Pré-Work já foi enviado.', enviado: true });
  }

  // PDFs anexados e depois trocados ou removidos não ficam guardados
  const usados = anexosUsados(dados);
  const sobras = [...arquivos.keys()].filter((id) => !usados.includes(id));
  if (sobras.length) {
    await db.execute({
      sql: `DELETE FROM pre_work_arquivos WHERE pre_work_id = ? AND id IN (${sobras.map(() => '?').join(',')})`,
      args: [pw.id, ...sobras],
    }).catch((err) => console.error('pre-work limpeza error:', err));
  }

  try {
    await notifyPreWork({
      projeto: dados.identificacao.projeto,
      email: dados.identificacao.email,
      leadId: pw.lead_id,
      secoes: resumir(dados),
    });
  } catch (err) {
    console.error('pre-work notify error:', err);
  }

  return res.status(200).json({ ok: true });
}

// ---------- admin ----------

async function gerar(body, res) {
  const leadId = Number(body.leadId);
  if (!leadId) return res.status(400).json({ error: 'Lead inválido.' });
  const db = getClient();
  const lead = await db.execute({ sql: 'SELECT id FROM leads WHERE id = ?', args: [leadId] });
  if (!lead.rows[0]) return res.status(404).json({ error: 'Lead não encontrado.' });

  // um Pré-Work por lead: gerar de novo devolve o mesmo link
  await db.execute({
    sql: 'INSERT INTO pre_works (lead_id, token) VALUES (?, ?) ON CONFLICT (lead_id) DO NOTHING',
    args: [leadId, crypto.randomBytes(18).toString('base64url')],
  });
  return detalhe(leadId, res);
}

async function detalhe(leadId, res) {
  const rs = await getClient().execute({ sql: 'SELECT * FROM pre_works WHERE lead_id = ?', args: [Number(leadId)] });
  const pw = rs.rows[0];
  if (!pw) return res.status(200).json({ preWork: null });

  const item = {
    status: pw.status,
    url: urlDoToken(pw.token),
    created_at: pw.created_at,
    enviado_at: pw.enviado_at,
  };
  if (pw.status === 'enviado') {
    try { item.secoes = resumir(JSON.parse(pw.respostas)); } catch { item.secoes = []; }
    item.arquivos = await arquivosDo(pw.id);
  }
  return res.status(200).json({ preWork: item });
}

async function baixar(id, res) {
  const rs = ARQUIVO_RE.test(String(id))
    ? await getClient().execute({ sql: 'SELECT nome, bytes FROM pre_work_arquivos WHERE id = ?', args: [String(id)] })
    : { rows: [] };
  if (!rs.rows[0]) return res.status(404).send('Arquivo não encontrado.');
  const nome = String(rs.rows[0].nome).replace(/[^\w.\- ]+/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nome}"; filename*=UTF-8''${encodeURIComponent(rs.rows[0].nome)}`);
  return res.status(200).send(Buffer.from(rs.rows[0].bytes));
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    await ensureSchema();
    const query = req.query || {};

    if (req.method === 'GET') {
      if (query.token) { await abrir(String(query.token), res); return; }
      if (!isAdmin(req)) { res.status(401).json({ error: 'não autenticado' }); return; }
      if (query.lead) { await detalhe(query.lead, res); return; }
      if (query.arquivo) { await baixar(query.arquivo, res); return; }
      res.status(400).json({ error: 'pedido inválido' });
      return;
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.acao === 'upload') { await upload(body, res); return; }
      if (body.acao === 'enviar') { await enviar(body, res); return; }
      if (body.acao === 'gerar') {
        if (!isAdmin(req)) { res.status(401).json({ error: 'não autenticado' }); return; }
        await gerar(body, res);
        return;
      }
      res.status(400).json({ error: 'Ação inválida.' });
      return;
    }

    res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    console.error('pre-work error:', err);
    res.status(500).json({ error: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
