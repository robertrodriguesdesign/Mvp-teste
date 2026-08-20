// Vercel Serverless Function — POST /api/submit
// Sends the project form data to the Fihan team via Resend, and mirrors the
// lead to the Meta Conversions API (server-side, deduped with the browser Pixel).

import { sendMetaCapiEvent, buildUserData, getClientIp } from './_meta-capi.js';

const TEAM_EMAILS = ['wellington@fihan.com.br', 'robert@fihan.com.br'];
const FROM = 'Fihan <form@fihan.com.br>';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const STAGE_LABEL = {
  ideia: 'Tenho a ideia',
  validando: 'Validando',
  mvp: 'Tenho MVP',
  operando: 'Já opero',
  reposicionar: 'Reposicionar',
};
const AXIS_LABEL = {
  negocio: 'Negócio',
  marca: 'Marca',
  dev: 'Desenvolvimento',
  completo: 'Protocolo completo',
};
const BUDGET_LABEL = {
  ate30: 'Até R$30K',
  '30-80': 'R$30K – R$80K',
  '80-150': 'R$80K – R$150K',
  '150+': 'R$150K+',
  conversar: 'Quero conversar',
};
const URGENCY_LABEL = {
  agora: 'Já — precisa começar este mês',
  '60': 'Próximos 60 dias',
  '90': 'Próximos 90 dias',
  aberto: 'Sem prazo definido',
};

const renderEmailHtml = (data, protocolId) => {
  const row = (k, v) =>
    `<tr><td style="padding:10px 16px;background:#FAFAFA;border-bottom:1px solid #ECECEC;font:500 12px/1.4 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#5C6066;text-transform:uppercase;letter-spacing:.08em;width:35%;vertical-align:top;">${escapeHtml(k)}</td>
       <td style="padding:10px 16px;background:#FFFFFF;border-bottom:1px solid #ECECEC;font:400 14px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111314;vertical-align:top;">${v}</td></tr>`;

  const axisStr = Array.isArray(data.axis) && data.axis.length
    ? data.axis.map((a) => AXIS_LABEL[a] || a).join(', ')
    : '—';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E2D6;">
    <tr><td style="padding:24px 28px 16px;background:#0F0F0F;color:#FAFAFA;">
      <div style="font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#E4F184;">/ NOVO PROJETO RECEBIDO</div>
      <div style="font:700 22px/1.2 -apple-system,sans-serif;letter-spacing:-.02em;margin-top:8px;">${escapeHtml(data.company || data.name || 'Submissão')}</div>
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
        ${row('Empresa/Projeto', escapeHtml(data.company))}
        ${row('Estágio', escapeHtml(STAGE_LABEL[data.stage] || data.stage || '—'))}
        ${row('Eixos de interesse', escapeHtml(axisStr))}
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;letter-spacing:-.01em;">Decisão</td></tr>
    <tr><td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ECECEC;border-radius:10px;overflow:hidden;">
        ${row('Investimento', escapeHtml(BUDGET_LABEL[data.budget] || data.budget || '—'))}
        ${row('Urgência', escapeHtml(URGENCY_LABEL[data.urgency] || data.urgency || '—'))}
      </table>
    </td></tr>
    <tr><td style="padding:16px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;letter-spacing:-.01em;">O que quer validar</td></tr>
    <tr><td style="padding:0 28px 24px;">
      <div style="padding:16px 18px;background:#FAFAFA;border:1px solid #ECECEC;border-left:3px solid #0F0F0F;border-radius:8px;font:400 14px/1.55 -apple-system,sans-serif;color:#2A2D31;white-space:pre-wrap;">${escapeHtml(data.description)}</div>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#0F0F0F;color:#8A8E94;font:400 12px/1.5 -apple-system,sans-serif;">
      Responder em até 48h úteis. <a href="mailto:${escapeHtml(data.email)}?subject=Re%3A%20${encodeURIComponent(data.company || 'projeto')}" style="color:#E4F184;">Responder ao founder ↗</a>
    </td></tr>
  </table>
</body></html>`;
};

const renderEmailText = (data, protocolId) => {
  const axisStr = Array.isArray(data.axis) && data.axis.length
    ? data.axis.map((a) => AXIS_LABEL[a] || a).join(', ')
    : '—';
  return [
    `NOVO PROJETO RECEBIDO — ${data.company || data.name || ''}`,
    `Protocolo ${protocolId} · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
    ``,
    `CONTATO`,
    `Nome: ${data.name}`,
    `E-mail: ${data.email}`,
    `WhatsApp: ${data.whatsapp}`,
    ``,
    `PROJETO`,
    `Empresa: ${data.company}`,
    `Estágio: ${STAGE_LABEL[data.stage] || data.stage || '—'}`,
    `Eixos: ${axisStr}`,
    ``,
    `DECISÃO`,
    `Investimento: ${BUDGET_LABEL[data.budget] || data.budget || '—'}`,
    `Urgência: ${URGENCY_LABEL[data.urgency] || data.urgency || '—'}`,
    ``,
    `DESCRIÇÃO`,
    data.description || '',
    ``,
    `— Responder em até 48h úteis`,
  ].join('\n');
};

// Envia via Resend (precisa de RESEND_API_KEY). Sem key → cliente faz fallback.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'resend_not_configured', fallback: 'formsubmit' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'JSON inválido' });
  }

  if (data.website) {
    return res.status(200).json({ ok: true, protocolId: 'FH-BOT' });
  }

  const required = ['name', 'email', 'whatsapp', 'company', 'stage', 'description', 'budget', 'urgency'];
  const missing = required.filter((k) => !data[k] || String(data[k]).trim() === '');
  if (missing.length) {
    return res.status(400).json({ error: `Campos obrigatórios faltando: ${missing.join(', ')}` });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const protocolId = 'FH-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 8999));

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: FROM,
        to: TEAM_EMAILS,
        reply_to: data.email,
        subject: `[Fihan] Novo projeto · ${data.company || data.name} · ${protocolId}`,
        html: renderEmailHtml(data, protocolId),
        text: renderEmailText(data, protocolId),
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('[submit] Resend error', r.status, out);
      return res.status(502).json({ error: 'Falha ao enviar e-mail', detail: out?.message || `HTTP ${r.status}` });
    }

    // Meta Conversions API — server-side "Lead" (deduped via shared event_id).
    // Best-effort: never blocks the success response. Awaited so it finishes
    // before the serverless function freezes.
    const meta = data.meta || {};
    const phoneDigits = String(data.whatsapp || '').replace(/\D/g, '');
    const nameParts = String(data.name || '').trim().split(/\s+/);
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');
    await sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: meta.eventId,
      eventSourceUrl: meta.sourceUrl,
      userData: buildUserData({
        email: data.email,
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
        content_name: 'Protocolo Fihan',
        content_category: 'Inscrição',
      },
    });

    return res.status(200).json({ ok: true, protocolId, provider: 'resend' });
  } catch (err) {
    console.error('[submit] Network error', err);
    return res.status(500).json({ error: 'Erro inesperado ao enviar' });
  }
}
