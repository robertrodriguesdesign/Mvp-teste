// Vercel Serverless Function — /api/admin/upload
//
// Upload de mídia pro CMS de conteúdo (fotos e vídeos anexados a
// artigos/cases). O arquivo vai no corpo bruto da requisição (stream),
// autenticado por Basic Auth, e sobe pro Vercel Blob via put().
//
// Limite real: toda function serverless da Vercel tem teto de ~4.5MB por
// requisição (limite da plataforma, não configurável aqui) — vale pra
// fotos, mas NÃO cobre vídeo de verdade. Por isso o formulário de
// Conteúdo trata "vídeo" como link (YouTube/Vimeo/já hospedado em algum
// lugar) por padrão, e só oferece upload direto pra imagens.
//
// Requer a env var BLOB_READ_WRITE_TOKEN (criada ao conectar o Blob Store
// ao projeto na Vercel).

import { put } from '@vercel/blob';
import { requireAdminAuth } from '../_admin-auth.js';

const ALLOWED_TYPES = /^image\/(png|jpe?g|gif|webp|svg\+xml|avif)$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const adminEmail = requireAdminAuth(req, res);
  if (!adminEmail) return;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'blob_not_configured', detail: 'BLOB_READ_WRITE_TOKEN ausente.' });
  }

  const contentType = req.headers['content-type'] || '';
  if (!ALLOWED_TYPES.test(contentType)) {
    return res.status(400).json({ error: 'invalid_type', detail: 'Só imagens (png, jpg, gif, webp, svg, avif) por upload direto.' });
  }

  var rawName = req.headers['x-filename'] ? decodeURIComponent(String(req.headers['x-filename'])) : 'upload';
  var safeName = rawName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 120) || 'upload';

  try {
    const blob = await put(`content/${adminEmail}/${Date.now()}-${safeName}`, req, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    });
    return res.status(200).json({ url: blob.url });
  } catch (err) {
    console.error('[admin/upload] error', err.message);
    return res.status(400).json({ error: 'upload_error', detail: err.message });
  }
}
