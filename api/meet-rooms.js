// Vercel Serverless Function — /api/meet-rooms
//
// Gestão de reuniões (host) pro Meet home (/meet). Auth Basic com o mesmo
// par de admins de api/_admin-auth.js (só robert@ e wellington@).
//
//   POST   /api/meet-rooms   { title?, mode?, scheduledAt? }   → cria reunião (auth)
//                              scheduledAt ausente = instantânea (agora)
//   GET    /api/meet-rooms?action=list                        → lista reuniões (auth)
//   DELETE /api/meet-rooms?id=123                              → encerra reunião (auth)
//
// A criação de sala no LiveKit em si é implícita: a sala só existe de fato lá
// quando o primeiro participante entra com um token válido (ver /api/meet-token).
// Aqui só reservamos o slug e guardamos os metadados no Postgres.

import { createMeeting, listMeetings, endMeetingById, normalizeMode } from './_meet-db.js';
import { requireAdminAuth } from './_admin-auth.js';

const originOf = (req) => {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
};

const serializeMeeting = (row, origin) => ({
  id: row.id,
  roomId: row.slug,
  title: row.title,
  mode: row.mode,
  url: `${origin}/call/${row.slug}`,
  hostEmail: row.host_email,
  createdAt: row.created_at,
  scheduledAt: row.scheduled_at,
  endedAt: row.ended_at,
});

export default async function handler(req, res) {
  const adminEmail = requireAdminAuth(req, res);
  if (!adminEmail) return;

  const origin = originOf(req);

  if (req.method === 'GET') {
    const action = (req.query?.action || 'list').toString();
    if (action !== 'list') return res.status(400).json({ error: 'action inválida' });
    try {
      const rows = await listMeetings();
      return res.status(200).json({ ok: true, meetings: rows.map((r) => serializeMeeting(r, origin)) });
    } catch (err) {
      console.error('[meet-rooms] GET error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  if (req.method === 'POST') {
    let data;
    try {
      data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    try {
      const row = await createMeeting({
        title: data.title,
        mode: normalizeMode(data.mode),
        hostEmail: adminEmail,
        scheduledAt: data.scheduledAt,
      });
      return res.status(201).json({ ok: true, meeting: serializeMeeting(row, origin) });
    } catch (err) {
      console.error('[meet-rooms] POST error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const id = parseInt((req.query?.id || '').toString(), 10);
    if (!id) return res.status(400).json({ error: 'id inválido' });
    try {
      const updated = await endMeetingById(id);
      return res.status(200).json({ ok: true, ended: updated > 0 });
    } catch (err) {
      console.error('[meet-rooms] DELETE error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ error: 'Method not allowed' });
}
