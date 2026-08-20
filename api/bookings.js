// Vercel Serverless Function — /api/bookings
//
// POST /api/bookings { protocolId, startUtc }  — endpoint PÚBLICO (sem login)
// usado pela tela de agendamento em /contatos, depois que o lead já passou
// pelo /api/context-lead (etapa 3 do formulário).
//
// Fluxo: valida que o protocolId existe (evita reserva forjada sem lead por
// trás) → revalida o horário contra a grade aberta (api/_booking-config.js,
// nunca confia no que o cliente mandou) → tenta inserir em `bookings`
// (colisão de horário = 409, ver constraint UNIQUE(slot_start)) → cria a
// sala no Fihan Meet reaproveitando createMeeting() de api/_meet-db.js (sem
// alterar esse arquivo) → grava o slug da sala na reserva → notifica lead e
// time por e-mail.
//
// GET /api/bookings?action=agenda  — painel admin (Fihan Calendário, ver
// /admin/agenda). Auth Basic (api/_admin-auth.js). Junto ao endpoint POST
// acima só pra não estourar o limite de Serverless Functions do plano
// Hobby da Vercel (12) — são domínios relacionados (mesma tabela `bookings`).

import { isValidSlot, BOOKING_SLOT_MINUTES } from './_booking-config.js';
import { createBooking, attachMeetingSlug, sql, ensureSchema as ensureBookingsSchema } from './_bookings-db.js';
import { getContextLeadByProtocol, ensureSchema as ensureLeadsSchema } from './_context-db.js';
import { createMeeting } from './_meet-db.js';
import { sendMetaCapiEvent, buildUserData, getClientIp } from './_meta-capi.js';
import { requireAdminAuth } from './_admin-auth.js';

const TEAM_EMAILS = ['wellington@fihan.com.br', 'robert@fihan.com.br'];
const FROM = 'Fihan <form@fihan.com.br>';

const originOf = (req) => {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

const formatSlot = (date) =>
  date.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const sendConfirmationEmails = async ({ lead, meetingUrl, startDate }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const when = formatSlot(startDate);
  const subject = `[Fihan] Reunião confirmada · ${lead.business_name || lead.name} · ${when}`;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E2D6;">
    <tr><td style="padding:24px 28px 16px;background:#0F0F0F;color:#FAFAFA;">
      <div style="font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#E4F184;">/ REUNIÃO CONFIRMADA</div>
      <div style="font:700 22px/1.2 -apple-system,sans-serif;letter-spacing:-.02em;margin-top:8px;">${escapeHtml(when)}</div>
    </td></tr>
    <tr><td style="padding:24px 28px;">
      <p style="font:400 14px/1.6 -apple-system,sans-serif;color:#2A2D31;margin:0 0 16px;">Protocolo ${escapeHtml(lead.protocol_id)} · ${escapeHtml(lead.business_name || lead.name)}</p>
      <a href="${escapeHtml(meetingUrl)}" style="display:inline-block;padding:12px 22px;background:#111314;color:#FAFAFA;text-decoration:none;font:600 14px/1 'IBM Plex Mono',monospace;">Entrar na reunião ↗</a>
      <p style="font:400 13px/1.6 -apple-system,sans-serif;color:#5C6066;margin:16px 0 0;">Link: <a href="${escapeHtml(meetingUrl)}" style="color:#334766;">${escapeHtml(meetingUrl)}</a></p>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#0F0F0F;color:#8A8E94;font:400 12px/1.5 -apple-system,sans-serif;">
      Dúvidas? <a href="https://wa.me/5527997289739" style="color:#E4F184;">Fale com a gente no WhatsApp ↗</a>
    </td></tr>
  </table>
</body></html>`;
  const text = `REUNIÃO CONFIRMADA — ${when}\nProtocolo ${lead.protocol_id}\nLink: ${meetingUrl}`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: [lead.email, ...TEAM_EMAILS],
        subject,
        html,
        text,
      }),
    });
  } catch (err) {
    console.error('[bookings] Resend error', err.message);
  }
};

export default async function handler(req, res) {
  if (req.method === 'GET' && String(req.query?.action || '') === 'agenda') {
    return handleAgenda(req, res);
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  const protocolId = String(data.protocolId || '').trim();
  const startUtc = String(data.startUtc || '').trim();
  if (!protocolId) return res.status(400).json({ error: 'protocolId obrigatório' });

  const startDate = new Date(startUtc);
  if (Number.isNaN(startDate.getTime())) return res.status(400).json({ error: 'startUtc inválido' });

  let lead;
  try {
    lead = await getContextLeadByProtocol(protocolId);
  } catch (err) {
    console.error('[bookings] lead lookup error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
  if (!lead) return res.status(404).json({ error: 'protocol_not_found' });

  if (!isValidSlot(startUtc)) return res.status(422).json({ error: 'invalid_slot' });

  const endDate = new Date(startDate.getTime() + BOOKING_SLOT_MINUTES * 60000);

  let bookingResult;
  try {
    bookingResult = await createBooking({
      protocolId,
      slotStart: startDate.toISOString(),
      slotEnd: endDate.toISOString(),
    });
  } catch (err) {
    console.error('[bookings] insert error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
  if (bookingResult.conflict) return res.status(409).json({ error: 'slot_taken' });

  const booking = bookingResult.row;
  const origin = originOf(req);
  let meetingUrl = null;

  try {
    const meeting = await createMeeting({
      title: lead.business_name || lead.name,
      mode: 'video',
      hostEmail: 'wellington@fihan.com.br',
    });
    await attachMeetingSlug(booking.id, meeting.slug);
    meetingUrl = `${origin}/call/${meeting.slug}`;
  } catch (err) {
    console.error('[bookings] meeting creation error', err.message);
    // Reserva já está confirmada no banco mesmo se a sala falhar — não bloqueia
    // a confirmação do horário, só entra sem link de sala (time recebe o e-mail
    // e pode gerar o link manualmente via /admin se precisar).
  }

  await sendConfirmationEmails({ lead, meetingUrl: meetingUrl || `${origin}/contatos`, startDate });

  await sendMetaCapiEvent({
    eventName: 'Schedule',
    eventSourceUrl: `${origin}/contatos`,
    userData: buildUserData({
      email: lead.email,
      phone: lead.whatsapp ? `55${String(lead.whatsapp).replace(/\D/g, '')}` : undefined,
      country: 'br',
      clientIp: getClientIp(req),
      clientUserAgent: req.headers['user-agent'],
    }),
    customData: {
      currency: 'BRL',
      value: 500,
      content_name: 'Reunião agendada · Fihan Meet',
    },
  });

  return res.status(201).json({
    ok: true,
    booking: { startUtc: startDate.toISOString(), endUtc: endDate.toISOString() },
    meetingUrl,
  });
}

// GET /api/bookings?action=agenda — lista reuniões confirmadas (join com o
// lead pra mostrar nome/negócio/eixo) pro painel /admin/agenda.
async function handleAgenda(req, res) {
  const email = requireAdminAuth(req, res);
  if (!email) return;

  try {
    await ensureBookingsSchema();
    await ensureLeadsSchema();

    const from = String(req.query?.from || '').trim();
    const to = String(req.query?.to || '').trim();
    const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? from : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toDate = to && !Number.isNaN(new Date(to).getTime()) ? to : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const { rows } = await sql`
      SELECT b.id, b.protocol_id, b.slot_start, b.slot_end, b.status, b.meeting_slug, b.created_at,
             l.name, l.email, l.whatsapp, l.business_name, l.stage, l.eixo, l.revenue_range
        FROM bookings b
        LEFT JOIN context_leads l ON l.protocol_id = b.protocol_id
       WHERE b.status = 'confirmed' AND b.slot_start BETWEEN ${fromDate} AND ${toDate}
       ORDER BY b.slot_start ASC;
    `;

    const origin = originOf(req);
    const bookings = rows.map((r) => ({
      id: r.id,
      protocolId: r.protocol_id,
      startUtc: r.slot_start,
      endUtc: r.slot_end,
      status: r.status,
      meetingUrl: r.meeting_slug ? `${origin}/call/${r.meeting_slug}` : null,
      lead: {
        name: r.name,
        email: r.email,
        whatsapp: r.whatsapp,
        businessName: r.business_name,
        stage: r.stage,
        eixo: r.eixo,
        revenueRange: r.revenue_range,
      },
    }));

    return res.status(200).json({ ok: true, bookings });
  } catch (err) {
    console.error('[bookings] agenda error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
}
