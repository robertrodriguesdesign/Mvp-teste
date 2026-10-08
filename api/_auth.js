const crypto = require('crypto');

const COOKIE_NAME = 'fihan_os_session';

// mesma verificação do middleware.js, repetida nas functions de escrita para
// que elas não dependam só do matcher do middleware
function isAdmin(req) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;

  const cookie = (req.headers.cookie || '')
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return false;

  const token = cookie.slice(COOKIE_NAME.length + 1);
  const sep = token.indexOf('.');
  if (sep === -1) return false;

  const expiry = Number(token.slice(0, sep));
  if (!expiry || Date.now() > expiry) return false;

  const expected = crypto.createHmac('sha256', secret).update(String(expiry)).digest('hex');
  const given = token.slice(sep + 1);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

module.exports = { isAdmin };
