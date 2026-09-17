const { getClient, ensureSchema } = require('./_db');

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
  const eixos = Array.isArray(body.eixos) ? body.eixos.join(', ') : clean(body.eixos, 300);

  try {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT INTO leads (nome, email, whatsapp, empresa, estagio, eixos, investimento, urgencia, mensagem)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        nome,
        email,
        clean(body.whatsapp, 40),
        clean(body.empresa, 200),
        clean(body.estagio, 60),
        eixos,
        clean(body.investimento, 60),
        clean(body.urgencia, 80),
        clean(body.mensagem, 4000),
      ],
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('submit-lead error:', err);
    res.status(500).json({ error: 'falha ao salvar o lead' });
  }
};
