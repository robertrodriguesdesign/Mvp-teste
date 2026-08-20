// Vercel Serverless Function — GET /api/sales-count
//
// Conta as vendas reais do Playbook (leads com status = 'comprou', marcados
// pelo webhook da Hotmart em /api/hotmart) e devolve o total pra barra de
// progresso da página crescer sozinha a cada venda — lote 0, meta de 50 cópias.
//
// Env vars (opcionais, na Vercel):
//   SALES_GOAL      → meta de cópias no lote (default 50)
//   SALES_BASELINE  → "semente" somada às vendas reais. Default 0: o lote 0
//                     começa zerado e a barra só anda com venda de verdade.
//   LOTE_START      → data/hora de abertura do lote atual (ISO). Só as compras
//                     com purchased_at a partir daí entram na conta — as vendas
//                     do lote anterior (a R$ 24) ficam de fora e o lote 0
//                     realmente começa do zero. Ao abrir o lote seguinte, é só
//                     mover esta data e a barra zera de novo.
//
// Nunca quebra a página: se o Postgres não estiver disponível, responde 200
// com o baseline como fallback e a barra usa o valor estático do HTML.

import { ensureSchema, sql } from './_leads-db.js';

const int = (v, def) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
};

// Abertura do lote 0 = momento em que o preço de R$ 35 entrou no ar
// (17/08/2026). Vendas dos lotes anteriores (R$ 24 e R$ 97) não contam.
const LOTE_START_DEFAULT = '2026-08-17T00:00:00Z';
const loteStart = () => {
  const raw = (process.env.LOTE_START || '').trim();
  if (!raw) return LOTE_START_DEFAULT;
  return Number.isNaN(Date.parse(raw)) ? LOTE_START_DEFAULT : raw;
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const goal = int(process.env.SALES_GOAL, 50);
  const baseline = int(process.env.SALES_BASELINE, 0);
  const since = loteStart();

  // Cache curto na borda: a barra não precisa ser real-time ao segundo.
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  let real = 0;
  try {
    await ensureSchema();
    // purchased_at NULL = compra antiga, anterior ao carimbo — fica de fora.
    const { rows } = await sql`
      SELECT count(*)::int AS n
        FROM leads
       WHERE status = 'comprou'
         AND purchased_at IS NOT NULL
         AND purchased_at >= ${since}::timestamptz;
    `;
    real = rows?.[0]?.n ?? 0;
  } catch (err) {
    console.error('[sales-count] db indisponível:', err.message);
    // segue com real = 0 e responde 200 — fallback = baseline
  }

  const sold = Math.min(baseline + real, goal);
  const percent = goal > 0 ? Math.round((sold / goal) * 1000) / 10 : 0;

  return res.status(200).json({ sold, total: goal, real, baseline, percent, since });
}
