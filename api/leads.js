const { getClient, ensureSchema } = require('./_db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { from, to } = req.query || {};
  const clauses = [];
  const args = [];
  if (from) { clauses.push('date(created_at) >= ?'); args.push(String(from)); }
  if (to) { clauses.push('date(created_at) <= ?'); args.push(String(to)); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT id, created_at, nome, email, whatsapp, empresa, estagio, eixos, investimento, urgencia, mensagem
            FROM leads ${where}
            ORDER BY created_at DESC`,
      args,
    });
    res.status(200).json({ leads: rs.rows });
  } catch (err) {
    console.error('leads error:', err);
    res.status(500).json({ error: 'falha ao buscar leads' });
  }
};
