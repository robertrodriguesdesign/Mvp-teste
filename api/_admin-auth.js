// Shared HTTP Basic Auth helper para as áreas de admin (CRM de leads e CMS
// de conteúdo). Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Substitui o checkAuth() que antes vivia duplicado em api/leads.js e
// api/meet-rooms.js (par único ADMIN_EMAIL/ADMIN_PASSWORD) por uma lista de
// usuários nomeados, com a senha comparada por hash (nunca texto puro).
//
// Os dois admins usam a mesma senha ("adm123"), então o hash abaixo é
// compartilhado. Pode ser sobrescrito por ambiente sem mudar código:
//   ADMIN_ROBERT_PASSWORD_HASH / ADMIN_WELLINGTON_PASSWORD_HASH (bcrypt hash)

import bcrypt from 'bcryptjs';

// bcrypt de "adm123" (custo 10). Gerado uma vez — nunca a senha em texto puro.
const DEFAULT_PASSWORD_HASH = '$2b$10$8qkk6vNT1z2nMgKd.d2nJ.4k/3INH5jIfUlvdPqYS5DZE3z3.iOhq';

const ADMIN_USERS = [
  {
    email: 'robert@fihan.com.br',
    passwordHash: process.env.ADMIN_ROBERT_PASSWORD_HASH || DEFAULT_PASSWORD_HASH,
  },
  {
    email: 'wellington@fihan.com.br',
    passwordHash: process.env.ADMIN_WELLINGTON_PASSWORD_HASH || DEFAULT_PASSWORD_HASH,
  },
];

const parseBasicAuth = (req) => {
  const header = req.headers['authorization'] || '';
  const m = header.match(/^Basic\s+(.+)$/i);
  if (!m) return null;
  let decoded = '';
  try {
    decoded = Buffer.from(m[1], 'base64').toString('utf8');
  } catch {
    return null;
  }
  const idx = decoded.indexOf(':');
  if (idx === -1) return null;
  return { email: decoded.slice(0, idx).trim().toLowerCase(), password: decoded.slice(idx + 1) };
};

// Retorna o e-mail do admin autenticado, ou null se as credenciais não baterem.
export const authenticateAdmin = (req) => {
  const creds = parseBasicAuth(req);
  if (!creds) return null;
  const user = ADMIN_USERS.find((u) => u.email === creds.email);
  if (!user) return null;
  return bcrypt.compareSync(creds.password, user.passwordHash) ? user.email : null;
};

// Aplica o header 401 padrão (mesmo realm usado hoje pelo CRM de leads).
export const requireAdminAuth = (req, res) => {
  const email = authenticateAdmin(req);
  if (!email) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Fihan Admin"');
    res.status(401).json({ error: 'unauthorized' });
    return null;
  }
  return email;
};
