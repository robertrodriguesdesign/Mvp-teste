// Shared DB helper para os leads do formulário de contato em 3 etapas
// (/contatos). Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Domínio separado de api/_leads-db.js (mini-CRM do funil do ebook — colunas
// e status não têm relação) e de api/submit.js (formulário legado usado por
// captura/index.html via script.js — taxonomia de campos diferente, não
// mexer nele). protocol_id é a chave que o agendador (api/bookings.js) usa
// pra buscar os dados do lead sem precisar reenviar PII do navegador.

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

let schemaReady = false;
export const ensureSchema = async () => {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS context_leads (
      id              SERIAL PRIMARY KEY,
      protocol_id     TEXT UNIQUE NOT NULL,
      name            TEXT NOT NULL,
      email           TEXT NOT NULL,
      whatsapp        TEXT NOT NULL,
      business_name   TEXT,
      stage           TEXT,
      eixo            TEXT,
      revenue_range   TEXT,
      decision_text   TEXT,
      roi_eixos       TEXT,
      roi_faturamento NUMERIC,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  schemaReady = true;
};

const genProtocolId = () =>
  'FH-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 8999));

export const createContextLead = async (data) => {
  await ensureSchema();
  for (let attempt = 0; attempt < 5; attempt++) {
    const protocolId = genProtocolId();
    try {
      const { rows } = await sql`
        INSERT INTO context_leads (
          protocol_id, name, email, whatsapp, business_name,
          stage, eixo, revenue_range, decision_text, roi_eixos, roi_faturamento
        ) VALUES (
          ${protocolId}, ${data.name}, ${data.email}, ${data.whatsapp}, ${data.businessName || null},
          ${data.stage || null}, ${data.eixo || null}, ${data.revenueRange || null}, ${data.decisionText || null},
          ${data.roiEixos || null}, ${data.roiFaturamento ?? null}
        )
        RETURNING *;
      `;
      return rows[0];
    } catch (err) {
      if (!/unique/i.test(err.message || '')) throw err;
    }
  }
  throw new Error('Não foi possível gerar um protocolo único, tente novamente.');
};

export const getContextLeadByProtocol = async (protocolId) => {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM context_leads WHERE protocol_id = ${protocolId} LIMIT 1;`;
  return rows[0] || null;
};
