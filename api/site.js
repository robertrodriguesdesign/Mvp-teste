// lado público do que é cadastrado no admin: páginas de projeto e do blog,
// a lista de publicados, as imagens enviadas e o sitemap desses conteúdos
const { getClient, ensureSchema } = require('./_db');
const { SITE, renderProjeto, renderPost, renderBlog, renderNaoEncontrado } = require('./_render');

// a CDN guarda por 1 min e serve a versão anterior enquanto atualiza —
// uma publicação aparece no site em até um minuto
const CACHE_PAGINA = 'public, s-maxage=60, stale-while-revalidate=300';

function comDados(row) {
  const c = { ...row };
  try { c.dados = JSON.parse(row.dados || '{}'); } catch { c.dados = {}; }
  return c;
}

async function publicados(tipo) {
  const rs = await getClient().execute({
    sql: `SELECT slug, titulo, resumo, capa, published_at, updated_at
          FROM conteudos WHERE tipo = ? AND status = 'publicado'
          ORDER BY published_at DESC`,
    args: [tipo],
  });
  return rs.rows.map((r) => ({ ...r }));
}

async function publicado(tipo, slug) {
  const rs = await getClient().execute({
    sql: "SELECT * FROM conteudos WHERE tipo = ? AND slug = ? AND status = 'publicado'",
    args: [tipo, String(slug || '')],
  });
  return rs.rows[0] ? comDados(rs.rows[0]) : null;
}

function html(res, status, body) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? CACHE_PAGINA : 'public, s-maxage=30');
  res.status(status).send(body);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const { pagina, slug, lista, midia, sitemap } = req.query || {};

  try {
    await ensureSchema();

    if (midia) {
      const id = String(midia).replace(/\.[a-z]+$/i, '');
      const rs = /^[a-f0-9]{24}$/.test(id)
        ? await getClient().execute({ sql: 'SELECT mime, bytes FROM midias WHERE id = ?', args: [id] })
        : { rows: [] };
      if (!rs.rows[0]) { res.status(404).send('Imagem não encontrada.'); return; }
      res.setHeader('Content-Type', rs.rows[0].mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.status(200).send(Buffer.from(rs.rows[0].bytes));
      return;
    }

    if (lista === 'projeto' || lista === 'post') {
      res.setHeader('Cache-Control', CACHE_PAGINA);
      res.status(200).json({ conteudos: await publicados(lista) });
      return;
    }

    if (sitemap) {
      const [projetos, posts] = await Promise.all([publicados('projeto'), publicados('post')]);
      const entrada = (base) => (c) =>
        `  <url><loc>${SITE}${base}/${c.slug}</loc><lastmod>${String(c.updated_at).slice(0, 10)}</lastmod></url>`;
      const urls = [
        ...(posts.length ? [`  <url><loc>${SITE}/blog</loc></url>`] : []),
        ...projetos.map(entrada('/trabalhos')),
        ...posts.map(entrada('/blog')),
      ];
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', CACHE_PAGINA);
      res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
      return;
    }

    if (pagina === 'blog') {
      html(res, 200, renderBlog(await publicados('post')));
      return;
    }
    if (pagina === 'post') {
      const c = await publicado('post', slug);
      if (c) html(res, 200, renderPost(c));
      else html(res, 404, renderNaoEncontrado('/blog', { href: '/blog', rotulo: 'Ver todos os artigos' }));
      return;
    }
    if (pagina === 'projeto') {
      const c = await publicado('projeto', slug);
      if (c) html(res, 200, renderProjeto(c));
      else html(res, 404, renderNaoEncontrado('/trabalhos', { href: '/trabalhos', rotulo: 'Ver todos os trabalhos' }));
      return;
    }

    res.status(400).json({ error: 'pedido inválido' });
  } catch (err) {
    console.error('site error:', err);
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).send('Não foi possível carregar esta página agora.');
  }
};
