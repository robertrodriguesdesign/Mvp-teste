// Shared DB helper para o agendador ("Fihan Meet — Agenda").
// Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Usado por api/availability.js (lê horários já reservados) e
// api/bookings.js (confirma uma reserva).

import { createPool } from '@vercel/postgres';

// Mesma cadeia de fallback usada em api/_leads-db.js e api/_meet-db.js — a
// integração Neon da Vercel pode injetar o connection string com ou sem o
// prefixo "POSTGRES_URL_".
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

let schemaReady = false;
export const ensureSchema = async () => {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id            SERIAL PRIMARY KEY,
      protocol_id   TEXT NOT NULL,
      slot_start    TIMESTAMPTZ NOT NULL,
      slot_end      TIMESTAMPTZ NOT NULL,
      status        TEXT NOT NULL DEFAULT 'confirmed',
      meeting_slug  TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT bookings_slot_unique UNIQUE (slot_start)
    );
  `;
  schemaReady = true;
};

// Tenta reservar um horário. Em caso de colisão (alguém já reservou o mesmo
// slot_start), retorna { conflict: true } em vez de lançar — quem chama
// decide o que fazer (409 pro cliente re-buscar a disponibilidade).
export const createBooking = async ({ protocolId, slotStart, slotEnd }) => {
  await ensureSchema();
  try {
    const { rows } = await sql`
      INSERT INTO bookings (protocol_id, slot_start, slot_end)
      VALUES (${protocolId}, ${slotStart}, ${slotEnd})
      RETURNING *;
    `;
    return { conflict: false, row: rows[0] };
  } catch (err) {
    if (/unique/i.test(err.message || '')) return { conflict: true, row: null };
    throw err;
  }
};

export const attachMeetingSlug = async (bookingId, slug) => {
  await ensureSchema();
  await sql`UPDATE bookings SET meeting_slug = ${slug} WHERE id = ${bookingId};`;
};

// Horários já confirmados num intervalo — usado pra excluir da grade livre.
export const listBookedStarts = async (fromIso, toIso) => {
  await ensureSchema();
  const { rows } = await sql`
    SELECT slot_start FROM bookings
     WHERE status = 'confirmed' AND slot_start BETWEEN ${fromIso} AND ${toIso};
  `;
  return rows.map((r) => new Date(r.slot_start).getTime());
};
