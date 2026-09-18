const crypto = require('crypto');

const COOKIE_NAME = 'fihan_os_session';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const { user, pass } = req.body || {};
  const expectedUser = process.env.CRM_ADMIN_USER;
  const expectedPass = process.env.CRM_ADMIN_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expectedUser || !expectedPass || !secret) {
    res.status(500).json({ error: 'login não configurado' });
    return;
  }
  if (user !== expectedUser || pass !== expectedPass) {
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
