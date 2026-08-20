// Shared DB helper para o CMS de conteúdo (artigos e cases de portfólio).
// Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Usado por api/content.js. Mesmo padrão de conexão de api/_leads-db.js.

import { createPool } from '@vercel/postgres';

const CONNECTION_STRING =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_POSTGRES_PRISMA_URL ||
  '';

let _pool = null;
const getPool = () => {
  if (!CONNECTION_STRING) throw new Error('Postgres não configurado (defina POSTGRES_URL na Vercel).');
  if (!_pool) _pool = createPool({ connectionString: CONNECTION_STRING });
  return _pool;
};

export const sql = (strings, ...values) => getPool().sql(strings, ...values);

// Tipos e status possíveis de um item de conteúdo.
export const TYPES = ['artigo', 'case'];
export const STATUSES = ['draft', 'published'];

export const normalizeType = (t) => {
  const v = String(t || '').trim().toLowerCase();
  return TYPES.includes(v) ? v : null;
};

export const normalizeStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  return STATUSES.includes(v) ? v : null;
};

// Slug simples e previsível a partir do título (sem acento, minúsculo, hífens).
export const slugify = (title) =>
  String(title || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

let schemaReady = false;
export const ensureSchema = async () => {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS content_items (
      id           SERIAL PRIMARY KEY,
      type         TEXT NOT NULL,
      slug         TEXT NOT NULL UNIQUE,
      title        TEXT NOT NULL,
      summary      TEXT,
      body         TEXT,
      cover_url    TEXT,
      category     TEXT,
      year         TEXT,
      impact       TEXT,
      challenge    TEXT,
      attachments  JSONB NOT NULL DEFAULT '[]',
      status       TEXT NOT NULL DEFAULT 'draft',
      author_email TEXT NOT NULL,
      published_at TIMESTAMPTZ,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  schemaReady = true;
};

// Garante um slug único: se já existir, sufixa -2, -3, ... até achar um livre.
// excludeId é usado em edições (não colide com o próprio registro).
export const ensureUniqueSlug = async (baseSlug, excludeId) => {
  const base = baseSlug || 'item';
  let candidate = base;
  let n = 2;
  for (;;) {
    const { rows } = excludeId
      ? await sql`SELECT id FROM content_items WHERE slug = ${candidate} AND id <> ${excludeId} LIMIT 1;`
      : await sql`SELECT id FROM content_items WHERE slug = ${candidate} LIMIT 1;`;
    if (rows.length === 0) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
};
