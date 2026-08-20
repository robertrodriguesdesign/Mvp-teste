// Vercel Serverless Function — POST /api/context-lead
//
// Submit da etapa 3 do formulário de contato em 3 passos (/contatos). Salva
// o lead no Postgres (context_leads — domínio próprio, ver api/_context-db.js),
// notifica o time via Resend e espelha na Meta Conversions API.
//
// Endpoint IRMÃO de /api/submit — não o mesmo. api/submit.js é usado por
// captura/index.html (via script.js) com uma taxonomia de campos diferente e
// não deve ser alterado. Este endpoint tem sua própria taxonomia (Estágio,
// Eixo, Faixa de faturamento) e devolve um protocolId que a etapa seguinte
// (agendador, /api/bookings) usa pra recuperar os dados do lead sem precisar
// reenviar PII do navegador.

import { createContextLead } from './_context-db.js';
import { sendMetaCapiEvent, buildUserData, getClientIp } from './_meta-capi.js';

const TEAM_EMAILS = ['wellington@fihan.com.br', 'robert@fihan.com.br'];
const FROM = 'Fihan <form@fihan.com.br>';

const STAGE_LABEL = {
  ideia: 'Ainda é ideia',
  mvp: 'Tenho MVP',
  fatura: 'Já fatura',
  escalar: 'Preciso escalar',
};
const EIXO_LABEL = {
  negocio: 'Negócio',
  marca: 'Marca',
  dev: 'Dev',
  todos: 'Os três',
};
const REVENUE_LABEL = {
  pre: 'Pré-receita',
  ate10k: 'Até R$10k',
  '10-50k': 'R$10k–50k',
  '50-200k': 'R$50k–200k',
  '200k+': 'R$200k+',
};

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderEmailHtml = (data, protocolId) => {
  const row = (k, v) =>
    `<tr><td style="padding:10px 16px;background:#FAFAFA;border-bottom:1px solid #ECECEC;font:500 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#5C6066;text-transform:uppercase;letter-spacing:.08em;width:35%;vertical-align:top;">${escapeHtml(k)}</td>
       <td style="padding:10px 16px;background:#FFFFFF;border-bottom:1px solid #ECECEC;font:400 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111314;vertical-align:top;">${v}</td></tr>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E2D6;">
    <tr><td style="padding:24px 28px 16px;background:#0F0F0F;color:#FAFAFA;">
      <div style="font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#E4F184;">/ NOVO CONTATO · FORMULÁRIO 3 ETAPAS</div>
      <div style="font:700 22px/1.2 -apple-system,sans-serif;letter-spacing:-.02em;margin-top:8px;">${escapeHtml(data.businessName || data.name || 'Submissão')}</div>
      <div style="font:400 13px/1.4 -apple-system,sans-serif;color:#B4B7BB;margin-top:4px;">Protocolo ${escapeHtml(protocolId)} · recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
    </td></tr>
    <tr><td style="padding:20px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;letter-spacing:-.01em;">Contato</td></tr>
    <tr><td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ECECEC;border-radius:10px;overflow:hidden;">
        ${row('Nome', escapeHtml(data.name))}
        ${row('E-mail', `<a href="mailto:${escapeHtml(data.email)}" style="color:#334766;">${escapeHtml(data.email)}</a>`)}
        ${row('WhatsApp', `<a href="https://wa.me/55${escapeHtml(String(data.whatsapp || '').replace(/\D/g, ''))}" style="color:#334766;">${escapeHtml(data.whatsapp)}</a>`)}
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;letter-spacing:-.01em;">Projeto</td></tr>
    <tr><td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ECECEC;border-radius:10px;overflow:hidden;">
        ${row('Negócio/ideia', escapeHtml(data.businessName))}
        ${row('Estágio', escapeHtml(STAGE_LABEL[data.stage] || data.stage || '—'))}
        ${row('Eixo que mais preocupa', escapeHtml(EIXO_LABEL[data.eixo] || data.eixo || '—'))}
        ${row('Faturamento mensal', escapeHtml(REVENUE_LABEL[data.revenueRange] || data.revenueRange || '—'))}
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;letter-spacing:-.01em;">Decisão com medo de errar</td></tr>
    <tr><td style="padding:0 28px 24px;">
      <div style="padding:16px 18px;background:#FAFAFA;border:1px solid #ECECEC;border-left:3px solid #0F0F0F;border-radius:8px;font:400 14px/1.55 -apple-system,sans-serif;color:#2A2D31;white-space:pre-wrap;">${escapeHtml(data.decisionText)}</div>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#0F0F0F;color:#8A8E94;font:400 12px/1.5 -apple-system,sans-serif;">
      Responder em até 48h úteis. <a href="mailto:${escapeHtml(data.email)}?subject=Re%3A%20${encodeURIComponent(data.businessName || 'projeto')}" style="color:#E4F184;">Responder ao founder ↗</a>
    </td></tr>
  </table>
</body></html>`;
};

const renderEmailText = (data, protocolId) =>
  [
    `NOVO CONTATO — ${data.businessName || data.name || ''}`,
    `Protocolo ${protocolId} · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ``,
    `CONTATO`,
    `Nome: ${data.name}`,
    `E-mail: ${data.email}`,
    `WhatsApp: ${data.whatsapp}`,
    ``,
    `PROJETO`,
    `Negócio/ideia: ${data.businessName || '—'}`,
    `Estágio: ${STAGE_LABEL[data.stage] || data.stage || '—'}`,
    `Eixo que mais preocupa: ${EIXO_LABEL[data.eixo] || data.eixo || '—'}`,
    `Faturamento mensal: ${REVENUE_LABEL[data.revenueRange] || data.revenueRange || '—'}`,
    ``,
    `DECISÃO COM MEDO DE ERRAR`,
    data.decisionText || '',
    ``,
    `— Responder em até 48h úteis`,
  ].join('\n');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (data.website) return res.status(200).json({ ok: true, protocolId: 'FH-BOT' });

  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim();
  const whatsapp = String(data.whatsapp || '').trim();
  const businessName = String(data.businessName || '').trim();
  const decisionText = String(data.decisionText || '').trim();

  const missing = [];
  if (name.length < 2) missing.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) missing.push('email');
  if (whatsapp.replace(/\D/g, '').length < 8) missing.push('whatsapp');
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatórios inválidos: ${missing.join(', ')}` });
  }

  const payload = {
    name,
    email,
    whatsapp,
    businessName,
    stage: data.stage || null,
    eixo: data.eixo || null,
    revenueRange: data.revenueRange || null,
    decisionText,
    roiEixos: Array.isArray(data.roiEixos) ? data.roiEixos.join(',') : data.roiEixos || null,
    roiFaturamento: typeof data.roiFaturamento === 'number' ? data.roiFaturamento : null,
  };

  let row;
  try {
    row = await createContextLead(payload);
  } catch (err) {
    console.error('[context-lead] INSERT error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }

  const protocolId = row.protocol_id;

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: FROM,
          to: TEAM_EMAILS,
          reply_to: email,
          subject: `[Fihan] Novo contato · ${businessName || name} · ${protocolId}`,
          html: renderEmailHtml(payload, protocolId),
          text: renderEmailText(payload, protocolId),
        }),
      });
      if (!r.ok) {
        const out = await r.json().catch(() => ({}));
        console.error('[context-lead] Resend error', r.status, out);
      }
    } catch (err) {
      console.error('[context-lead] Resend network error', err.message);
    }
  }

  const meta = data.meta || {};
  const phoneDigits = whatsapp.replace(/\D/g, '');
  const nameParts = name.split(/\s+/);
  const firstName = nameParts.shift() || '';
  const lastName = nameParts.join(' ');

  await sendMetaCapiEvent({
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
      value: 500,
      content_name: 'Contato Fihan · 3 etapas',
      content_category: 'Formulário',
    },
  });

  return res.status(200).json({ ok: true, protocolId });
}
