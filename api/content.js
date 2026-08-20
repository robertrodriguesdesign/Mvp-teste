// Vercel Serverless Function — /api/content
//
// CMS de conteúdo do site institucional: artigos (blog) e cases de
// portfólio. Mesmo padrão de api/leads.js (um handler, métodos HTTP
// roteados por if/else, sem framework).
//
//   GET  /api/content?type=artigo&status=published   → lista pública (só publicados)
//   GET  /api/content?slug=zei-app                    → um item por slug (público só se publicado)
//   GET  /api/content?action=list                     → lista completa p/ admin (Basic Auth, inclui rascunhos)
//   POST /api/content                                  → cria (Basic Auth)
//   PATCH /api/content?id=                             → edita (Basic Auth)
//   DELETE /api/content?id=                            → remove (Basic Auth)

import {
  sql,
  ensureSchema,
  normalizeType,
  normalizeStatus,
  slugify,
  ensureUniqueSlug,
} from './_content-db.js';
import { authenticateAdmin, requireAdminAuth } from './_admin-auth.js';

const parseBody = (req) => {
  if (!req.body) return {};
  return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
};

const ATTACHMENT_KINDS = ['photo', 'video', 'link'];

// Normaliza o array de anexos vindo do cliente — nunca confia no shape bruto.
const normalizeAttachments = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((a) => a && typeof a === 'object' && ATTACHMENT_KINDS.includes(a.kind) && a.url)
    .map((a) => ({
      kind: a.kind,
      url: String(a.url).trim(),
      caption: a.caption ? String(a.caption).trim().slice(0, 300) : '',
    }))
    .slice(0, 40);
};

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      await ensureSchema();
      const { slug, type, status, action } = req.query || {};
      const adminEmail = authenticateAdmin(req);

      // ---- item único por slug ----
      if (slug) {
        const { rows } = await sql`SELECT * FROM content_items WHERE slug = ${String(slug)} LIMIT 1;`;
        const item = rows[0];
        if (!item) return res.status(404).json({ error: 'not_found' });
        if (item.status !== 'published' && !adminEmail) {
          return res.status(404).json({ error: 'not_found' });
        }
        return res.status(200).json({ item });
      }

      // ---- lista completa (admin) ----
      if (action === 'list') {
        if (!requireAdminAuth(req, res)) return;
        const t = normalizeType(type);
        const rows = t
          ? (await sql`SELECT * FROM content_items WHERE type = ${t} ORDER BY created_at DESC;`).rows
          : (await sql`SELECT * FROM content_items ORDER BY created_at DESC;`).rows;
        return res.status(200).json({ items: rows });
      }

      // ---- lista pública ----
      const t = normalizeType(type);
      // Visitante sem auth só vê publicado, sempre — mesmo que peça outro status.
      const st = adminEmail ? normalizeStatus(status) : 'published';
      let rows;
      if (t && st) {
        rows = (await sql`SELECT * FROM content_items WHERE type = ${t} AND status = ${st} ORDER BY published_at DESC NULLS LAST, created_at DESC;`).rows;
      } else if (t) {
        rows = (await sql`SELECT * FROM content_items WHERE type = ${t} ORDER BY published_at DESC NULLS LAST, created_at DESC;`).rows;
      } else if (st) {
        rows = (await sql`SELECT * FROM content_items WHERE status = ${st} ORDER BY published_at DESC NULLS LAST, created_at DESC;`).rows;
      } else {
        rows = (await sql`SELECT * FROM content_items ORDER BY published_at DESC NULLS LAST, created_at DESC;`).rows;
      }
      return res.status(200).json({ items: rows });
    }

    if (req.method === 'POST') {
      const adminEmail = requireAdminAuth(req, res);
      if (!adminEmail) return;
      await ensureSchema();

      const data = parseBody(req);
      const type = normalizeType(data.type);
      const title = String(data.title || '').trim();
      if (!type) return res.status(400).json({ error: 'invalid_type', detail: 'type deve ser "artigo" ou "case".' });
      if (!title) return res.status(400).json({ error: 'invalid_title', detail: 'title é obrigatório.' });

      const baseSlug = data.slug ? slugify(data.slug) : slugify(title);
      const slug = await ensureUniqueSlug(baseSlug || 'item');
      const status = normalizeStatus(data.status) || 'draft';
      const publishedAt = status === 'published' ? new Date().toISOString() : null;
      const attachments = JSON.stringify(normalizeAttachments(data.attachments));

      const { rows } = await sql`
        INSERT INTO content_items
          (type, slug, title, summary, body, cover_url, category, year, impact, challenge, attachments, status, author_email, published_at)
        VALUES
          (${type}, ${slug}, ${title}, ${data.summary || null}, ${data.body || null}, ${data.coverUrl || null},
           ${data.category || null}, ${data.year || null}, ${data.impact || null}, ${data.challenge || null},
           ${attachments}::jsonb, ${status}, ${adminEmail}, ${publishedAt})
        RETURNING *;
      `;
      return res.status(201).json({ item: rows[0] });
    }

    if (req.method === 'PATCH') {
      const adminEmail = requireAdminAuth(req, res);
      if (!adminEmail) return;
      await ensureSchema();

      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'missing_id' });
      const { rows: existingRows } = await sql`SELECT * FROM content_items WHERE id = ${id} LIMIT 1;`;
      const existing = existingRows[0];
      if (!existing) return res.status(404).json({ error: 'not_found' });

      const data = parseBody(req);
      const nextTitle = data.title !== undefined ? String(data.title).trim() : existing.title;
      let nextSlug = existing.slug;
      if (data.slug !== undefined) {
        nextSlug = await ensureUniqueSlug(slugify(data.slug) || existing.slug, existing.id);
      }
      const nextStatus = data.status !== undefined ? (normalizeStatus(data.status) || existing.status) : existing.status;
      const wasPublished = existing.status === 'published';
      const nowPublished = nextStatus === 'published';
      const nextPublishedAt = !wasPublished && nowPublished
        ? new Date().toISOString()
        : (nowPublished ? existing.published_at : null);
      const nextAttachments = data.attachments !== undefined
        ? JSON.stringify(normalizeAttachments(data.attachments))
        : JSON.stringify(existing.attachments || []);

      const { rows } = await sql`
        UPDATE content_items SET
          title = ${nextTitle},
          slug = ${nextSlug},
          summary = ${data.summary !== undefined ? data.summary : existing.summary},
          body = ${data.body !== undefined ? data.body : existing.body},
          cover_url = ${data.coverUrl !== undefined ? data.coverUrl : existing.cover_url},
          category = ${data.category !== undefined ? data.category : existing.category},
          year = ${data.year !== undefined ? data.year : existing.year},
          impact = ${data.impact !== undefined ? data.impact : existing.impact},
          challenge = ${data.challenge !== undefined ? data.challenge : existing.challenge},
          attachments = ${nextAttachments}::jsonb,
          status = ${nextStatus},
          published_at = ${nextPublishedAt},
          updated_at = now()
        WHERE id = ${id}
        RETURNING *;
      `;
      return res.status(200).json({ item: rows[0] });
    }

    if (req.method === 'DELETE') {
      const adminEmail = requireAdminAuth(req, res);
      if (!adminEmail) return;
      await ensureSchema();
      const { id } = req.query || {};
      if (!id) return res.status(400).json({ error: 'missing_id' });
      await sql`DELETE FROM content_items WHERE id = ${id};`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    console.error('[content]', req.method, 'error', err.message);
    return res.status(500).json({ error: 'db_error', detail: err.message });
  }
}
