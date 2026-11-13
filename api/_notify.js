// aviso por e-mail a cada lead novo, via API HTTP da Resend (sem dependência)
const DEFAULT_TO = ['robert@fihan.com.br', 'wellington@fihan.com.br'];
const DEFAULT_FROM = 'Fihan <form@fihan.com.br>';
const TIMEOUT_MS = 8000;

const FIELDS = [
  ['nome', 'Nome'],
  ['email', 'E-mail'],
  ['whatsapp', 'WhatsApp'],
  ['empresa', 'Empresa/Projeto'],
  ['estagio', 'Estágio'],
  ['eixos', 'Eixos de interesse'],
  ['investimento', 'Investimento'],
  ['urgencia', 'Urgência'],
  ['mensagem', 'Mensagem'],
  ['origem', 'Página de origem'],
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function recipients() {
  const fromEnv = (process.env.LEAD_NOTIFY_TO || '').split(',').map((s) => s.trim()).filter(Boolean);
  return fromEnv.length ? fromEnv : DEFAULT_TO;
}

// `saved` indica se o lead entrou no banco — quando não entrou, o e-mail é o
// único registro e precisa dizer isso
async function notifyLead(lead, { saved }) {
  const rows = FIELDS.filter(([key]) => lead[key]);
  const warning = saved
    ? ''
    : 'ATENÇÃO: este lead NÃO foi salvo no admin (falha no banco). Este e-mail é o único registro.';

  const text = [
    warning,
    ...rows.map(([key, label]) => `${label}: ${lead[key]}`),
    '',
    saved ? 'Ver no admin: https://fihan.com.br/admin/leads' : '',
  ].filter((line, i) => line || i > 0).join('\n');

  const html = `
    ${warning ? `<p style="color:#b42318;font-weight:bold">${escapeHtml(warning)}</p>` : ''}
    <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
      ${rows.map(([key, label]) => `
        <tr>
          <td style="vertical-align:top;color:#666;white-space:nowrap">${label}</td>
          <td style="white-space:pre-wrap">${escapeHtml(lead[key])}</td>
        </tr>`).join('')}
    </table>
    ${saved ? '<p style="font-family:sans-serif;font-size:14px"><a href="https://fihan.com.br/admin/leads">Ver no admin</a></p>' : ''}
  `;

  const subject = `[Fihan] Novo lead · ${lead.nome}${lead.empresa ? ` · ${lead.empresa}` : ''}`;
  await sendEmail({ subject, text, html, replyTo: lead.email });
}

async function sendEmail({ subject, text, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.LEAD_NOTIFY_FROM || DEFAULT_FROM,
      to: recipients(),
      reply_to: replyTo || undefined,
      subject: subject.replace(/[\r\n]+/g, ' '),
      text,
      html,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`resend ${res.status}: ${detail.slice(0, 300)}`);
  }
}

// aviso de Pré-Work recebido; `secoes` vem de resumir() em api/_prework.js
async function notifyPreWork({ projeto, email, leadId, secoes }) {
  const link = `https://fihan.com.br/admin/leads?lead=${leadId}`;
  const text = [
    ...secoes.map((s) => [`== ${s.titulo} ==`, ...s.itens.map((i) => `${i.rotulo}: ${i.valor}`)].join('\n')),
    '',
    `Ver no admin: ${link}`,
  ].join('\n\n');

  const html = `
    ${secoes.map((s) => `
      <h3 style="font-family:sans-serif;font-size:15px;margin:24px 0 8px">${escapeHtml(s.titulo)}</h3>
      <table cellpadding="6" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">
        ${s.itens.map((i) => `
          <tr>
            <td style="vertical-align:top;color:#666;width:240px">${escapeHtml(i.rotulo)}</td>
            <td style="white-space:pre-wrap">${escapeHtml(i.valor)}</td>
          </tr>`).join('')}
      </table>`).join('')}
    <p style="font-family:sans-serif;font-size:14px"><a href="${link}">Ver no admin</a></p>
  `;

  await sendEmail({ subject: `[Fihan] Pré-Work recebido · ${projeto}`, text, html, replyTo: email });
}

module.exports = { notifyLead, notifyPreWork };
