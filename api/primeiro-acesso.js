// cria os primeiros usuários do admin sem login — só funciona enquanto a
// tabela de usuários está vazia; depois disso responde 403
const { getClient, ensureSchema } = require('./_db');
const { hashSenha } = require('./_senha');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const lista = Array.isArray((req.body || {}).usuarios) ? req.body.usuarios.slice(0, 5) : [];
  const validos = lista.every((u) => u && typeof u.nome === 'string' && u.nome.trim()
    && typeof u.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email.trim())
    && typeof u.senha === 'string' && u.senha.length >= 8);
  if (!lista.length || !validos) {
    res.status(400).json({ error: 'dados inválidos' });
    return;
  }

  try {
    await ensureSchema();
    const db = getClient();
    const tx = await db.transaction('write');
    try {
      const rs = await tx.execute('SELECT COUNT(*) AS n FROM usuarios');
      if (Number(rs.rows[0].n) > 0) {
        await tx.rollback();
        res.status(403).json({ error: 'já existem usuários' });
        return;
      }
      for (const u of lista) {
        await tx.execute({
          sql: 'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
          args: [u.nome.trim(), u.email.trim().toLowerCase(), hashSenha(u.senha)],
        });
      }
      await tx.commit();
    } catch (err) {
      await tx.rollback().catch(() => {});
      throw err;
    }
    res.status(200).json({ ok: true, criados: lista.length });
  } catch (err) {
    console.error('primeiro-acesso error:', err);
    res.status(500).json({ error: 'falha ao criar usuários' });
  }
};
