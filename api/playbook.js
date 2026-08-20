// Vercel Serverless Function — POST /api/playbook
// Captura de lead da landing do playbook. Envia 2 emails:
//   1) Notificação pro time Fihan (wellington + robert)
//   2) Deliverable pro lead com o link do PDF
// Além disso, espelha o lead na Meta Conversions API (deduped com o Pixel).

import { sendMetaCapiEvent, buildUserData, getClientIp } from './_meta-capi.js';

const TEAM_EMAILS = ['wellington@fihan.com.br', 'robert@fihan.com.br'];
const FROM = 'Fihan <form@fihan.com.br>';
const PDF_URL = 'https://fihan.com.br/playbook/playbook-editais-fomento.pdf';
const LANDING_URL = 'https://fihan.com.br/playbook';

const escapeHtml = (str) =>
  String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/* ───────────────── Email pro time ───────────────── */
const renderTeamHtml = (data, leadId) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E2D6;">
    <tr><td style="padding:24px 28px 16px;background:#0F0F0F;color:#FAFAFA;">
      <div style="font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#14CC52;">/ NOVO LEAD · PLAYBOOK</div>
      <div style="font:700 22px/1.2 -apple-system,sans-serif;letter-spacing:-.02em;margin-top:8px;">${escapeHtml(data.name)}</div>
      <div style="font:400 13px/1.4 -apple-system,sans-serif;color:#B4B7BB;margin-top:4px;">Lead ${escapeHtml(leadId)} · recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</div>
    </td></tr>
    <tr><td style="padding:20px 28px 4px;font:600 13px/1 -apple-system,sans-serif;color:#111314;">Contato</td></tr>
    <tr><td style="padding:0 12px 12px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #ECECEC;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:10px 16px;background:#FAFAFA;border-bottom:1px solid #ECECEC;font:500 12px/1.4 -apple-system,sans-serif;color:#5C6066;text-transform:uppercase;letter-spacing:.08em;width:35%;vertical-align:top;">Nome</td>
          <td style="padding:10px 16px;background:#FFFFFF;border-bottom:1px solid #ECECEC;font:400 14px/1.5 -apple-system,sans-serif;color:#111314;">${escapeHtml(data.name)}</td>
        </tr>
        <tr>
          <td style="padding:10px 16px;background:#FAFAFA;font:500 12px/1.4 -apple-system,sans-serif;color:#5C6066;text-transform:uppercase;letter-spacing:.08em;width:35%;vertical-align:top;">E-mail</td>
          <td style="padding:10px 16px;background:#FFFFFF;font:400 14px/1.5 -apple-system,sans-serif;color:#111314;"><a href="mailto:${escapeHtml(data.email)}" style="color:#334766;">${escapeHtml(data.email)}</a></td>
        </tr>
      </table>
    </td></tr>
    <tr><td style="padding:14px 28px;background:#0F0F0F;color:#8A8E94;font:400 12px/1.5 -apple-system,sans-serif;">
      Origem: ${escapeHtml(LANDING_URL)} · <a href="mailto:${escapeHtml(data.email)}?subject=Playbook%20Fihan" style="color:#14CC52;">Responder ↗</a>
    </td></tr>
  </table>
</body></html>`;

const renderTeamText = (data, leadId) => [
  `NOVO LEAD · PLAYBOOK — ${data.name}`,
  `Lead ${leadId} · ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`,
  ``,
  `Nome: ${data.name}`,
  `E-mail: ${data.email}`,
  ``,
  `Origem: ${LANDING_URL}`,
].join('\n');

/* ───────────────── Email pro lead (deliverable) ───────────────── */
const renderLeadHtml = (data) => `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:24px;background:#F4F1EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E7E2D6;">
    <tr><td style="padding:32px 32px 16px;background:#0F0F0F;color:#FAFAFA;">
      <div style="font:500 11px/1 'IBM Plex Mono',monospace;letter-spacing:.14em;color:#14CC52;">/ FIHAN · INTELIGÊNCIA APLICADA</div>
      <div style="font:600 26px/1.15 'IBM Plex Mono',monospace;letter-spacing:-.02em;margin-top:12px;">Seu playbook<br>está pronto.</div>
    </td></tr>
    <tr><td style="padding:24px 32px 8px;">
      <p style="font:400 15px/1.6 -apple-system,sans-serif;color:#111314;margin:0 0 16px;">Oi, ${escapeHtml(data.name.split(' ')[0])}.</p>
      <p style="font:400 15px/1.6 -apple-system,sans-serif;color:#111314;margin:0 0 16px;">
        Obrigado por baixar o <strong>Playbook · Editais de Fomento no Brasil</strong>. São 14 páginas direto ao ponto sobre FINEP, BNDES, SEBRAE, Embrapii, FAPs estaduais e Lei do Bem.
      </p>
      <p style="font:400 15px/1.6 -apple-system,sans-serif;color:#111314;margin:0 0 24px;">
        Clica no botão abaixo pra baixar o PDF. Se preferir, salva esse email — o link continua válido.
      </p>
    </td></tr>
    <tr><td style="padding:0 32px 24px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
        <tr><td style="background:#14CC52;border-radius:6px;">
          <a href="${PDF_URL}" style="display:inline-block;padding:14px 28px;font:500 15px/1 -apple-system,sans-serif;color:#111314;text-decoration:none;">Baixar o playbook (PDF · 489KB) →</a>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 24px;">
      <div style="padding:16px 18px;background:#FAFAFA;border-left:3px solid #14CC52;border-radius:0 8px 8px 0;font:400 14px/1.55 -apple-system,sans-serif;color:#2A2D31;">
        <strong style="font-weight:600;">Próximo passo:</strong> Se algum edital do playbook fizer sentido para o seu projeto e você quiser ajuda pra transformar hipótese em proposta técnica aprovada, o Protocolo Fihan faz exatamente isso em 6 a 8 semanas. <a href="https://fihan.com.br/#form" style="color:#14CC52;">Conta pra gente sobre o projeto →</a>
      </div>
    </td></tr>
    <tr><td style="padding:18px 32px;background:#0F0F0F;color:#8A8E94;font:400 12px/1.5 -apple-system,sans-serif;">
      <p style="margin:0 0 6px;">Fihan · Inteligência aplicada à validação de negócios</p>
      <p style="margin:0;">
        <a href="mailto:wellington@fihan.com.br" style="color:#8A8E94;">wellington@fihan.com.br</a> ·
        <a href="https://wa.me/5527997289739" style="color:#8A8E94;">WhatsApp</a> ·
        <a href="https://fihan.com.br" style="color:#14CC52;">fihan.com.br</a>
      </p>
    </td></tr>
  </table>
</body></html>`;

const renderLeadText = (data) => [
  `Oi, ${data.name.split(' ')[0]}.`,
  ``,
  `Obrigado por baixar o Playbook · Editais de Fomento no Brasil.`,
  ``,
  `Baixar o PDF: ${PDF_URL}`,
  ``,
  `Se algum edital fizer sentido pro seu projeto e você quiser ajuda pra transformar hipótese em proposta técnica, conte com a Fihan: https://fihan.com.br/#form`,
  ``,
  `— Fihan · Inteligência aplicada`,
  `wellington@fihan.com.br · WhatsApp +55 (27) 99728-9739`,
].join('\n');

/* ───────────────── Handler ───────────────── */
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

  // Honeypot
  if (data.website) {
    return res.status(200).json({ ok: true, leadId: 'PB-BOT' });
  }

  // Validate
  if (!data.name || String(data.name).trim().length < 2) {
    return res.status(400).json({ error: 'Nome obrigatório' });
  }
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ error: 'E-mail inválido' });
  }

  const leadId = 'PB-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 8999));

  const sendEmail = async (payload) => {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      const err = new Error(out?.message || `HTTP ${r.status}`);
      err.status = r.status;
      err.payload = out;
      throw err;
    }
    return out;
  };

  try {
    // 1) Notificação pro time (não bloqueia se falhar)
    await sendEmail({
      from: FROM,
      to: TEAM_EMAILS,
      reply_to: data.email,
      subject: `[Fihan] Novo lead playbook · ${data.name} · ${leadId}`,
      html: renderTeamHtml(data, leadId),
      text: renderTeamText(data, leadId),
    });

    // 2) Deliverable pro lead
    await sendEmail({
      from: FROM,
      to: [data.email],
      reply_to: 'wellington@fihan.com.br',
      subject: 'Seu playbook · Editais de Fomento no Brasil',
      html: renderLeadHtml(data),
      text: renderLeadText(data),
    });

    // Meta Conversions API — server-side "Lead" (deduped via shared event_id).
    const meta = data.meta || {};
    const nameParts = String(data.name || '').trim().split(/\s+/);
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ');
    await sendMetaCapiEvent({
      eventName: 'Lead',
      eventId: meta.eventId,
      eventSourceUrl: meta.sourceUrl,
      userData: buildUserData({
        email: data.email,
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
        value: 0,
        content_name: 'Playbook · Editais de Fomento',
        content_category: 'Lead Magnet',
      },
    });

    return res.status(200).json({ ok: true, leadId, provider: 'resend', downloadUrl: PDF_URL });
  } catch (err) {
    console.error('[playbook] Resend error', err.status, err.payload || err.message);
    return res.status(502).json({ error: 'Falha ao enviar e-mail', detail: err.message });
  }
}
