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
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');

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

  const subject = `[Fihan] Novo lead · ${lead.nome}${lead.empresa ? ` · ${lead.empresa}` : ''}`.replace(/[\r\n]+/g, ' ');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.LEAD_NOTIFY_FROM || DEFAULT_FROM,
      to: recipients(),
      reply_to: lead.email,
      subject,
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

module.exports = { notifyLead };
