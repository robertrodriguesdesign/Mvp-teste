const crypto = require('crypto');
const { getClient, ensureSchema } = require('./_db');
const { conferirSenha } = require('./_senha');

const COOKIE_NAME = 'fihan_os_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias
const MAX_FALHAS = 5; // por login, a cada 15 minutos

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = req.body || {};
  const user = typeof body.user === 'string' ? body.user.trim() : '';
  const pass = typeof body.pass === 'string' ? body.pass : '';
  const chave = user.toLowerCase().slice(0, 200);
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    res.status(500).json({ error: 'login não configurado' });
    return;
  }
  if (!user || !pass) {
    res.status(401).json({ error: 'usuário ou senha inválidos' });
    return;
  }

  // usuários cadastrados em /admin/usuarios; se o banco estiver fora, o login
  // de emergência das variáveis de ambiente continua funcionando
  let db = null;
  let autorizado = false;
  try {
    await ensureSchema();
    db = getClient();

    const falhas = await db.execute({
      sql: "SELECT COUNT(*) AS n FROM login_falhas WHERE chave = ? AND quando > datetime('now', '-15 minutes')",
      args: [chave],
    });
    if (Number(falhas.rows[0].n) >= MAX_FALHAS) {
      res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente de novo.' });
      return;
    }

    const rs = await db.execute({ sql: 'SELECT senha_hash FROM usuarios WHERE email = ?', args: [chave] });
    autorizado = Boolean(rs.rows[0]) && conferirSenha(pass, rs.rows[0].senha_hash);
  } catch (err) {
    console.error('admin-login db error:', err);
    db = null;
  }

  if (!autorizado) {
    const envUser = process.env.CRM_ADMIN_USER;
    const envPass = process.env.CRM_ADMIN_PASSWORD;
    autorizado = Boolean(envUser && envPass) && user === envUser && pass === envPass;
  }

  if (db) {
    try {
      if (autorizado) {
        await db.execute({ sql: 'DELETE FROM login_falhas WHERE chave = ?', args: [chave] });
      } else {
        await db.batch([
          { sql: 'INSERT INTO login_falhas (chave) VALUES (?)', args: [chave] },
          "DELETE FROM login_falhas WHERE quando < datetime('now', '-1 day')",
        ], 'write');
      }
    } catch (err) {
      console.error('admin-login falhas error:', err);
    }
  }

  if (!autorizado) {
    res.status(401).json({ error: 'usuário ou senha inválidos' });
    return;
  }

  const expiry = Date.now() + SESSION_MS;
  const signature = crypto.createHmac('sha256', secret).update(String(expiry)).digest('hex');
  const token = `${expiry}.${signature}`;

  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_MS / 1000}; HttpOnly; Secure; SameSite=Lax`
  );
  res.status(200).json({ ok: true });
};
