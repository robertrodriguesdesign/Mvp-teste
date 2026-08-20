// Vercel Serverless Function — /api/leads
//
// Mini-CRM da landing do playbook (ebook). Coleta os dados do lead ANTES de
// levá-lo ao checkout da Hotmart e os persiste no Postgres (Vercel/Neon).
//
//   POST /api/leads                  → salva um lead { name, email, phone, idea }
//   GET  /api/leads?action=list      → lista leads em JSON        (requer auth)
//   GET  /api/leads?action=export    → baixa todos os leads em CSV (requer auth)
//
// Autenticação do admin (GET): HTTP Basic. Credenciais vêm das env vars
//   ADMIN_EMAIL    (default: robert@fihan.com.br)
//   ADMIN_PASSWORD (default: admin)
//
// Storage: Vercel Postgres (Neon). Usa a env var POSTGRES_URL, injetada
// automaticamente quando você conecta um banco Postgres ao projeto na Vercel.
//
// Best-effort (nunca bloqueia a venda): espelha o lead na Meta Conversions API
// e, se RESEND_API_KEY existir, notifica o time por email como backup.

import { sql, ensureSchema, normalizeStatus } from './_leads-db.js';
import { sendMetaCapiEvent, buildUserData, getClientIp } from './_meta-capi.js';
import { requireAdminAuth } from './_admin-auth.js';

const TEAM_EMAILS = ['wellington@fihan.com.br', 'robert@fihan.com.br'];
const FROM = 'Fihan <form@fihan.com.br>';

const STATUS_LABEL = { lead: 'Lead', comprou: 'Comprador', cliente: 'Cliente', reembolso: 'Reembolso' };

/* ───────────────── CSV ───────────────── */
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => {
  const header = ['id', 'nome', 'email', 'telefone', 'ideia', 'status', 'origem', 'criado_em', 'comprou_em'];
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id, r.name, r.email, r.phone, r.idea,
        STATUS_LABEL[r.status] || r.status || 'Lead',
        r.source,
        new Date(r.created_at).toISOString(),
        r.purchased_at ? new Date(r.purchased_at).toISOString() : '',
      ]
        .map(csvCell)
        .join(',')
    );
  }
  // BOM pra Excel abrir com acentuação correta
  return '﻿' + lines.join('\r\n');
};

/* ───────────────── Backup: notifica o time (best-effort) ───────────────── */
const escapeHtml = (str) =>
  String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const notifyTeam = async (data, leadId) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: TEAM_EMAILS,
        reply_to: data.email,
        subject: `[Fihan] Novo lead ebook · ${data.name} · ${leadId}`,
        text: [
          `NOVO LEAD · EBOOK (foi pro checkout)`,
          `Lead ${leadId}`,
          ``,
          `Nome: ${data.name}`,
          `E-mail: ${data.email}`,
          `Telefone: ${data.phone}`,
          `Ideia: ${data.idea}`,
        ].join('\n'),
        html:
          `<h2 style="font-family:sans-serif">Novo lead · ebook</h2>` +
          `<p style="font-family:sans-serif">Lead ${escapeHtml(leadId)}</p>` +
          `<ul style="font-family:sans-serif;font-size:14px">` +
          `<li><b>Nome:</b> ${escapeHtml(data.name)}</li>` +
          `<li><b>E-mail:</b> ${escapeHtml(data.email)}</li>` +
          `<li><b>Telefone:</b> ${escapeHtml(data.phone)}</li>` +
          `<li><b>Ideia:</b> ${escapeHtml(data.idea)}</li></ul>`,
      }),
    });
  } catch (err) {
    console.error('[leads] notifyTeam failed', err.message);
  }
};

/* ───────────────── Handler ───────────────── */
export default async function handler(req, res) {
  // ─── GET → admin (list / export) ───
  if (req.method === 'GET') {
    if (!requireAdminAuth(req, res)) return;
    try {
      await ensureSchema();
      const { rows } = await sql`SELECT * FROM leads ORDER BY created_at DESC;`;
      // Filtro opcional por status (?status=comprou | lead | reembolso).
      const statusFilter = normalizeStatus(req.query?.status);
      const filtered = statusFilter ? rows.filter((r) => (r.status || 'lead') === statusFilter) : rows;
      const action = (req.query?.action || 'list').toString();
      if (action === 'export') {
        const suffix = statusFilter ? `-${statusFilter}` : '';
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="fihan-leads${suffix}-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.status(200).send(toCsv(filtered));
      }
      return res.status(200).json({ ok: true, count: filtered.length, leads: filtered });
    } catch (err) {
      console.error('[leads] GET error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  // ─── PATCH → muda o status de um lead (admin) ───
  if (req.method === 'PATCH') {
    if (!requireAdminAuth(req, res)) return;
    const id = parseInt((req.query?.id || '').toString(), 10);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    const status = normalizeStatus(body.status);
    if (!status) return res.status(400).json({ error: 'status inválido (use lead | comprou | cliente | reembolso)' });
    try {
      await ensureSchema();
      const { rowCount } = await sql`
        UPDATE leads
           SET status = ${status},
               purchased_at = CASE
                 WHEN ${status} = 'comprou' THEN now()
                 WHEN ${status} = 'cliente' THEN purchased_at
                 ELSE NULL
               END
         WHERE id = ${id};
      `;
      return res.status(200).json({ ok: true, updated: rowCount, status });
    } catch (err) {
      console.error('[leads] PATCH error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  // ─── DELETE → remove um lead (admin) ───
  if (req.method === 'DELETE') {
    if (!requireAdminAuth(req, res)) return;
    const id = parseInt((req.query?.id || '').toString(), 10);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    try {
      await ensureSchema();
      const { rowCount } = await sql`DELETE FROM leads WHERE id = ${id};`;
      return res.status(200).json({ ok: true, deleted: rowCount });
    } catch (err) {
      console.error('[leads] DELETE error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  // ─── POST → salva lead ───
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  // Honeypot
  if (data.website) return res.status(200).json({ ok: true, leadId: 'PB-BOT' });

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const phone = String(data.phone || '').trim();
  const idea = String(data.idea || '').trim();

  const missing = [];
  if (name.length < 2) missing.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push('email');
  if (phone.replace(/\D/g, '').length < 8) missing.push('phone');
  if (idea.length < 2) missing.push('idea');
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatórios inválidos: ${missing.join(', ')}` });
  }

  const leadId = 'PB-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 8999));

  let saved = false;
  try {
    await ensureSchema();
    await sql`
      INSERT INTO leads (name, email, phone, idea, source)
      VALUES (${name}, ${email}, ${phone}, ${idea}, 'playbook');
    `;
    saved = true;
  } catch (err) {
    // Não bloqueia a venda: loga e segue. O email de backup garante a captura.
    console.error('[leads] INSERT error', err.message);
  }

  // Best-effort — nunca bloqueia o checkout.
  const meta = data.meta || {};
  const phoneDigits = phone.replace(/\D/g, '');
  const nameParts = name.split(/\s+/);
  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ');

  await Promise.allSettled([
    notifyTeam({ name, email, phone, idea }, leadId),
    sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: meta.eventId,
      eventSourceUrl: meta.sourceUrl,
      userData: buildUserData({
        email,
        phone: phoneDigits ? `55${phoneDigits}` : undefined,
        firstName,
        lastName,
        country: 'br',
        fbp: meta.fbp,
        fbc: meta.fbc,
        clientIp: getClientIp(req),
        clientUserAgent: req.headers['user-agent'],
      }),
      customData: {
        currency: 'BRL',
        value: 97,
        content_name: 'Playbook Editais de Fomento',
        content_category: 'Ebook',
      },
    }),
  ]);

  return res.status(200).json({ ok: true, leadId, saved });
}
