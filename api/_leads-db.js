// Shared DB helper para o mini-CRM de leads (Postgres/Neon).
// Prefixado com "_" pra Vercel NÃO expor como endpoint HTTP.
//
// Usado por api/leads.js (admin) e api/hotmart.js (webhook de compra).

import { createPool } from '@vercel/postgres';

// A integração Neon da Vercel foi conectada com o prefixo "POSTGRES_URL_",
// então as vars reais são POSTGRES_URL_POSTGRES_URL / POSTGRES_URL_DATABASE_URL.
// Aceitamos tanto os nomes padrão quanto os prefixados (pooled tem prioridade).
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

// Status possíveis de um lead. 'cliente' é setado manualmente pelo time no
// CRM (/admin) pra marcar quem já passou pelo Protocolo Fihan — não vem de
// nenhum webhook automático como 'comprou'/'reembolso' (Hotmart).
export const STATUSES = ['lead', 'comprou', 'cliente', 'reembolso'];
export const normalizeStatus = (s) => {
  const v = String(s || '').trim().toLowerCase();
  return STATUSES.includes(v) ? v : null;
};

let schemaReady = false;
export const ensureSchema = async () => {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id         SERIAL PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      phone      TEXT NOT NULL,
      idea       TEXT NOT NULL,
      source     TEXT NOT NULL DEFAULT 'playbook',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // Colunas de compra (idempotente — não quebra tabela já existente).
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'lead';`;
  await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;`;
  schemaReady = true;
};

// Marca o status de todos os leads com aquele e-mail (case-insensitive).
// 'comprou' carimba purchased_at; 'lead'/'reembolso' zeram; 'cliente'
// preserva o purchased_at que já existia (vira cliente sem perder quando comprou).
export const setStatusByEmail = async (email, status) => {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return 0;
  const st = normalizeStatus(status) || 'lead';
  const { rowCount } = await sql`
    UPDATE leads
       SET status = ${st},
           purchased_at = CASE
             WHEN ${st} = 'comprou' THEN now()
             WHEN ${st} = 'cliente' THEN purchased_at
             ELSE NULL
           END
     WHERE lower(email) = ${em};
  `;
  return rowCount;
};

// Webhook: se o comprador já é lead, atualiza status; senão cria o lead
// (comprador que caiu direto no checkout sem passar pelo modal).
export const upsertBuyer = async ({ name, email, phone }, status = 'comprou') => {
  const em = String(email || '').trim().toLowerCase();
  if (!em) return { matched: 0, created: false };
  const updated = await setStatusByEmail(em, status);
  if (updated > 0) return { matched: updated, created: false };

  const st = normalizeStatus(status) || 'comprou';
  const purchasedAt = st === 'comprou' ? new Date().toISOString() : null;
  await sql`
    INSERT INTO leads (name, email, phone, idea, source, status, purchased_at)
    VALUES (${String(name || 'Comprador Hotmart').trim() || 'Comprador Hotmart'},
            ${em},
            ${String(phone || '').trim()},
            ${'(compra direta)'},
            ${'hotmart'},
            ${st},
            ${purchasedAt});
  `;
  return { matched: 0, created: true };
};
