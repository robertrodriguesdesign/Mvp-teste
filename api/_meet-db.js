// Shared DB helper para o sistema de Reuniões (Postgres/Neon).
// Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Usado por api/meet-rooms.js (admin) e api/meet-token.js (guest/público).

import { createPool } from '@vercel/postgres';
import crypto from 'crypto';

// Mesma resolução de env vars usada em api/_leads-db.js — a integração Neon
// da Vercel pode injetar o connection string com ou sem o prefixo "POSTGRES_URL_".
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

// Tagged-template proxy: sql`...` funciona igual ao @vercel/postgres.
export const sql = (strings, ...values) => getPool().sql(strings, ...values);

export const MODES = ['video', 'audio'];
export const normalizeMode = (m) => {
  const v = String(m || '').trim().toLowerCase();
  return MODES.includes(v) ? v : 'video';
};

let schemaReady = false;
export const ensureSchema = async () => {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS meetings (
      id         SERIAL PRIMARY KEY,
      slug       TEXT UNIQUE NOT NULL,
      title      TEXT NOT NULL DEFAULT '',
      mode       TEXT NOT NULL DEFAULT 'video',
      host_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      ended_at   TIMESTAMPTZ
    );
  `;
  // scheduled_at NULL = reunião instantânea (começa agora). Preenchido =
  // reunião marcada pro Meet home (/meet) pra um horário específico.
  await sql`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;`;
  schemaReady = true;
};

// Slug curto no estilo Meet ("kdr-mvqz-jhs") — sem 0/o/1/l/i pra evitar
// ambiguidade quando alguém digita o link à mão.
const SLUG_CHARS = 'abcdefghjkmnpqrstuvwxyz23456789';
const randSlugPart = (len) => {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += SLUG_CHARS[bytes[i] % SLUG_CHARS.length];
  return out;
};
export const genSlug = () => `${randSlugPart(3)}-${randSlugPart(4)}-${randSlugPart(3)}`;

// Cria uma reunião com slug único (tenta algumas vezes em caso de colisão rara).
// scheduledAt (ISO string) é opcional — omitido/nulo = reunião instantânea.
export const createMeeting = async ({ title, mode, hostEmail, scheduledAt }) => {
  await ensureSchema();
  const m = normalizeMode(mode);
  const t = String(title || '').trim().slice(0, 120);
  const sch = scheduledAt && !Number.isNaN(new Date(scheduledAt).getTime()) ? new Date(scheduledAt).toISOString() : null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = genSlug();
    try {
      const { rows } = await sql`
        INSERT INTO meetings (slug, title, mode, host_email, scheduled_at)
        VALUES (${slug}, ${t}, ${m}, ${hostEmail || null}, ${sch})
        RETURNING *;
      `;
      return rows[0];
    } catch (err) {
      // Unique violation → tenta outro slug; qualquer outro erro propaga.
      if (!/unique/i.test(err.message || '')) throw err;
    }
  }
  throw new Error('Não foi possível gerar um link único, tente novamente.');
};

export const getMeetingBySlug = async (slug) => {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM meetings WHERE slug = ${slug} LIMIT 1;`;
  return rows[0] || null;
};

export const listMeetings = async (hostEmail) => {
  await ensureSchema();
  const { rows } = hostEmail
    ? await sql`SELECT * FROM meetings WHERE host_email = ${hostEmail} ORDER BY created_at DESC LIMIT 50;`
    : await sql`SELECT * FROM meetings ORDER BY created_at DESC LIMIT 50;`;
  return rows;
};

export const endMeetingById = async (id) => {
  await ensureSchema();
  const { rowCount } = await sql`
    UPDATE meetings SET ended_at = now() WHERE id = ${id} AND ended_at IS NULL;
  `;
  return rowCount;
};
