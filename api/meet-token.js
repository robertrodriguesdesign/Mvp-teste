// Vercel Serverless Function — /api/meet-token
//
// Endpoint PÚBLICO (sem login) usado pela página /call/:roomId — igual ao
// fluxo de convidado do Google Meet: quem recebe o link só digita o nome
// e entra, sem precisar de conta Fihan.
//
//   GET  /api/meet-token?roomId=abc-defg-hij   → dados da sala pro lobby (título/modo)
//   POST /api/meet-token { roomId, name, mode } → token de acesso ao LiveKit
//
// Quem CRIA a reunião (host) passa por /api/meet-rooms, que exige Basic Auth.
// Este arquivo nunca autentica — ele só valida que a sala existe e não foi
// encerrada, e emite um token de participante de curta duração.

import { AccessToken } from 'livekit-server-sdk';
import { getMeetingBySlug } from './_meet-db.js';

const LIVEKIT_URL = process.env.LIVEKIT_URL || '';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';

const SLUG_RE = /^[a-z0-9]{2,6}-[a-z0-9]{2,6}-[a-z0-9]{2,6}$/;

const escapeIdentity = (s) => String(s || '').replace(/[^a-zA-Z0-9 _.-]/g, '').trim();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const slug = String(req.query?.roomId || '').trim();
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'roomId inválido' });
    try {
      const meeting = await getMeetingBySlug(slug);
      if (!meeting) return res.status(404).json({ error: 'not_found' });
      if (meeting.ended_at) return res.status(410).json({ error: 'ended' });
      return res.status(200).json({
        ok: true,
        title: meeting.title || '',
        mode: meeting.mode,
        createdAt: meeting.created_at,
      });
    } catch (err) {
      console.error('[meet-token] GET error', err.message);
      return res.status(500).json({ error: 'db_error', detail: err.message });
    }
  }

  if (req.method === 'POST') {
    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET || !LIVEKIT_URL) {
      return res.status(500).json({ error: 'livekit_not_configured' });
    }
    let data;
    try {
      data = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    } catch {
      return res.status(400).json({ error: 'JSON inválido' });
    }
    const slug = String(data.roomId || '').trim();
    const name = escapeIdentity(data.name).slice(0, 60);
    if (!SLUG_RE.test(slug)) return res.status(400).json({ error: 'roomId inválido' });
    if (name.length < 1) return res.status(400).json({ error: 'Informe um nome.' });

    try {
      const meeting = await getMeetingBySlug(slug);
      if (!meeting) return res.status(404).json({ error: 'not_found' });
      if (meeting.ended_at) return res.status(410).json({ error: 'ended' });

      const identity = `guest-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
        identity,
        name,
        ttl: '6h',
      });
      at.addGrant({
        room: slug,
        roomJoin: true,
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        canUpdateOwnMetadata: true,
      });
      const token = await at.toJwt();

      return res.status(200).json({
        ok: true,
        token,
        wsUrl: LIVEKIT_URL,
        roomId: slug,
        title: meeting.title || '',
        mode: meeting.mode,
      });
    } catch (err) {
      console.error('[meet-token] POST error', err.message);
      return res.status(500).json({ error: 'server_error', detail: err.message });
    }
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
