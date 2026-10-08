const { getClient, ensureSchema } = require('./_db');
const { notifyLead } = require('./_notify');

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};
  const nome = clean(body.nome, 200);
  const email = clean(body.email, 200);

  if (!nome || !email) {
    res.status(400).json({ error: 'nome e email são obrigatórios' });
    return;
  }

  // eixos chega como array (checkboxes múltiplos) — guarda como CSV
  const eixos = Array.isArray(body.eixos) ? clean(body.eixos.join(', '), 300) : clean(body.eixos, 300);

  const lead = {
    nome,
    email,
    whatsapp: clean(body.whatsapp, 40),
    empresa: clean(body.empresa, 200),
    estagio: clean(body.estagio, 60),
    eixos,
    investimento: clean(body.investimento, 60),
    urgencia: clean(body.urgencia, 80),
    mensagem: clean(body.mensagem, 4000),
  };

  let saved = false;
  try {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT INTO leads (nome, email, whatsapp, empresa, estagio, eixos, investimento, urgencia, mensagem)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        lead.nome,
        lead.email,
        lead.whatsapp,
        lead.empresa,
        lead.estagio,
        lead.eixos,
        lead.investimento,
        lead.urgencia,
        lead.mensagem,
      ],
    });
    saved = true;
  } catch (err) {
    console.error('submit-lead error:', err);
  }

  // o aviso sai mesmo se o banco falhar, e a falha do aviso não derruba o
  // lead já salvo — só responde erro quando o lead não chegou a lugar nenhum
  let notified = false;
  try {
    await notifyLead({ ...lead, origem: clean(req.headers.referer, 300) }, { saved });
    notified = true;
  } catch (err) {
    console.error('submit-lead notify error:', err);
  }

  if (!saved && !notified) {
    res.status(500).json({ error: 'falha ao salvar o lead' });
    return;
  }
  res.status(200).json({ ok: true });
};
