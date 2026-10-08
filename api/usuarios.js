// usuários do admin: listar, criar, trocar senha e remover — só para quem
// já está logado
const { getClient, ensureSchema } = require('./_db');
const { isAdmin } = require('./_auth');
const { hashSenha } = require('./_senha');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MIN = 8;

function clean(value, maxLen) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function senhaValida(senha) {
  return typeof senha === 'string' && senha.length >= SENHA_MIN && senha.length <= 200;
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
      const rs = await db.execute('SELECT id, nome, email, created_at FROM usuarios ORDER BY nome');
      res.status(200).json({ usuarios: rs.rows.map((r) => ({ ...r })) });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'method not allowed' });
      return;
    }

    const body = req.body || {};

    if (body.acao === 'criar') {
      const nome = clean(body.nome, 120);
      const email = clean(body.email, 200).toLowerCase();
      if (!nome) { res.status(400).json({ error: 'Informe o nome.' }); return; }
      if (!EMAIL_RE.test(email)) { res.status(400).json({ error: 'Informe um e-mail válido.' }); return; }
      if (!senhaValida(body.senha)) { res.status(400).json({ error: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` }); return; }
      try {
        await db.execute({
          sql: 'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
          args: [nome, email, hashSenha(body.senha)],
        });
      } catch (err) {
        if (/UNIQUE/i.test(String(err && err.message))) {
          res.status(409).json({ error: 'Já existe um usuário com esse e-mail.' });
          return;
        }
        throw err;
      }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.acao === 'senha') {
      if (!senhaValida(body.senha)) { res.status(400).json({ error: `A senha precisa de pelo menos ${SENHA_MIN} caracteres.` }); return; }
      const rs = await db.execute({
        sql: 'UPDATE usuarios SET senha_hash = ? WHERE id = ?',
        args: [hashSenha(body.senha), Number(body.id)],
      });
      if (!rs.rowsAffected) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
      res.status(200).json({ ok: true });
      return;
    }

    if (body.acao === 'excluir') {
      await db.execute({ sql: 'DELETE FROM usuarios WHERE id = ?', args: [Number(body.id)] });
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: 'Ação inválida.' });
  } catch (err) {
    console.error('usuarios error:', err);
    res.status(500).json({ error: 'Não foi possível concluir agora. Tente de novo.' });
  }
};
