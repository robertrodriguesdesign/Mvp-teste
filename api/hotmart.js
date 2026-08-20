// Vercel Serverless Function — POST /api/hotmart
//
// Webhook (Postback) da Hotmart. Quando um pagamento é aprovado/reembolsado,
// a Hotmart chama esta URL e nós marcamos o lead correspondente (casando pelo
// e-mail do comprador) como "comprou" ou "reembolso" no mini-CRM.
//
// Configuração na Hotmart:
//   Ferramentas → Webhook (Postback) → adicionar URL:
//     https://fihan.com.br/api/hotmart
//   Eventos: Compra aprovada, Compra completa, Reembolso, Chargeback, Cancelamento.
//   Copie o "hottok" e salve como env var HOTMART_HOTTOK na Vercel (recomendado).
//
// Suporta os dois formatos de webhook da Hotmart:
//   v1 (form/JSON com hottok no corpo)  e  v2 (JSON com hottok no header).

import { ensureSchema, upsertBuyer } from './_leads-db.js';

// event_name (v2) / status (v1) → status interno do CRM
const APPROVED = new Set(['PURCHASE_APPROVED', 'PURCHASE_COMPLETE', 'APPROVED', 'COMPLETE', 'completo', 'aprovado']);
const REFUNDED = new Set([
  'PURCHASE_REFUNDED', 'PURCHASE_CHARGEBACK', 'PURCHASE_PROTEST', 'PURCHASE_CANCELED', 'PURCHASE_EXPIRED',
  'REFUNDED', 'CHARGEBACK', 'CANCELED', 'CANCELLED', 'EXPIRED', 'reembolso', 'cancelado', 'chargeback',
]);

const pickEmail = (b) =>
  b?.data?.buyer?.email ||
  b?.data?.customer?.email ||
  b?.buyer?.email ||
  b?.customer?.email ||
  b?.email ||
  '';

const pickName = (b) =>
  b?.data?.buyer?.name || b?.buyer?.name || b?.customer?.name || b?.name || '';

const pickPhone = (b) => {
  const p = b?.data?.buyer || b?.buyer || b?.customer || b || {};
  const ddd = p.checkout_phone_code || p.phone_local_code || '';
  const num = p.checkout_phone || p.phone || p.phone_number || '';
  return num ? `${ddd}${num}` : '';
};

const pickEvent = (b) =>
  b?.event || b?.data?.purchase?.status || b?.status || b?.prod_status || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    body = {};
  }

  // Validação do hottok (se HOTMART_HOTTOK estiver configurado).
  const expected = process.env.HOTMART_HOTTOK;
  if (expected) {
    const received = req.headers['x-hotmart-hottok'] || body.hottok || body.hottok_token || '';
    if (received !== expected) {
      console.warn('[hotmart] hottok inválido');
      return res.status(401).json({ error: 'invalid_hottok' });
    }
  }

  const email = pickEmail(body);
  const event = String(pickEvent(body) || '').trim();

  if (!email) {
    // Sem e-mail não dá pra casar; responde 200 pra Hotmart não ficar reenviando.
    console.warn('[hotmart] webhook sem e-mail', event);
    return res.status(200).json({ ok: true, ignored: 'no_email', event });
  }

  let status = null;
  if (APPROVED.has(event) || APPROVED.has(event.toUpperCase())) status = 'comprou';
  else if (REFUNDED.has(event) || REFUNDED.has(event.toUpperCase())) status = 'reembolso';

  if (!status) {
    return res.status(200).json({ ok: true, ignored: 'event_not_mapped', event });
  }

  try {
    await ensureSchema();
    const result = await upsertBuyer(
      { name: pickName(body), email, phone: pickPhone(body) },
      status
    );
    console.log('[hotmart]', event, '→', status, email, JSON.stringify(result));
    return res.status(200).json({ ok: true, event, status, ...result });
  } catch (err) {
    console.error('[hotmart] error', err.message);
    // 500 faz a Hotmart reenviar depois (retry) — bom pra não perder a marcação.
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
}
