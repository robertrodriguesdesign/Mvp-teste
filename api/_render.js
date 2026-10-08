// HTML das páginas públicas geradas a partir do que foi cadastrado no admin
const { HEAD_LINKS, TOPO, RODAPE } = require('./_layout');

const SITE = 'https://fihan.com.br';
const OG_PADRAO = `${SITE}/images/og-fihan.jpg`;

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// só deixa passar endereços http(s), caminhos do próprio site e mailto
function safeUrl(url) {
  const u = String(url || '').trim();
  return /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(u) ? u : '';
}

function absoluta(url) {
  const u = safeUrl(url);
  if (!u) return '';
  return u.startsWith('/') ? SITE + u : u;
}

function linkAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener"' : '';
}

function paragrafos(texto, classe) {
  return String(texto || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p class="${classe}">${esc(p).replace(/\n/g, '<br />')}</p>`)
    .join('\n      ');
}

function dataPorExtenso(sqlDate) {
  if (!sqlDate) return '';
  const d = new Date(`${sqlDate.replace(' ', 'T')}Z`);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo',
  }).format(d);
}

function dataIso(sqlDate) {
  return sqlDate ? `${sqlDate.replace(' ', 'T')}Z` : undefined;
}

/* ───── Markdown reduzido do corpo dos posts ─────
   Títulos (## e ###), negrito, itálico, links, listas, citação, imagem e
   linha divisória. Todo o texto é escapado antes; nenhum HTML passa. */
function inline(texto) {
  return esc(texto)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const href = safeUrl(url.replace(/&amp;/g, '&'));
      return href ? `<a href="${esc(href)}"${linkAttrs(href)}>${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

function markdown(texto) {
  const linhas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragrafo = [];
  let lista = null; // { tag, itens }
  let citacao = [];

  const fechar = () => {
    if (paragrafo.length) {
      html.push(`<p class="t-body-lg">${paragrafo.map(inline).join('<br />')}</p>`);
      paragrafo = [];
    }
    if (lista) {
      html.push(`<${lista.tag}>${lista.itens.map((i) => `<li class="t-body-lg">${inline(i)}</li>`).join('')}</${lista.tag}>`);
      lista = null;
    }
    if (citacao.length) {
      html.push(`<blockquote class="t-h3">${citacao.map(inline).join('<br />')}</blockquote>`);
      citacao = [];
    }
  };

  linhas.forEach((bruta) => {
    const linha = bruta.trim();
    let m;
    if (!linha) { fechar(); return; }

    if ((m = linha.match(/^(#{1,3})\s+(.+)$/))) {
      fechar();
      html.push(m[1].length === 3
        ? `<h3 class="t-h3">${inline(m[2])}</h3>`
        : `<h2 class="t-h2">${inline(m[2])}</h2>`);
    } else if ((m = linha.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
      fechar();
      const src = safeUrl(m[2]);
      if (src) {
        html.push(`<figure class="proj-capa"><img src="${esc(src)}" alt="${esc(m[1])}" loading="lazy" /></figure>`);
      }
    } else if (/^(-{3,}|\*{3,})$/.test(linha)) {
      fechar();
      html.push('<hr class="dobra__regua" />');
    } else if ((m = linha.match(/^[-*]\s+(.+)$/))) {
      if (!lista || lista.tag !== 'ul') { fechar(); lista = { tag: 'ul', itens: [] }; }
      lista.itens.push(m[1]);
    } else if ((m = linha.match(/^\d+[.)]\s+(.+)$/))) {
      if (!lista || lista.tag !== 'ol') { fechar(); lista = { tag: 'ol', itens: [] }; }
      lista.itens.push(m[1]);
    } else if ((m = linha.match(/^>\s?(.*)$/))) {
      if (!citacao.length) fechar();
      citacao.push(m[1]);
    } else {
      if (lista || citacao.length) fechar();
      paragrafo.push(linha);
    }
  });
  fechar();
  return html.join('\n      ');
}

/* ───── Moldura ───── */
function pagina({ titulo, descricao, caminho, imagem, ogType, jsonLd, noindex, overline, h1, lede, main }) {
  const url = SITE + caminho;
  const img = absoluta(imagem) || OG_PADRAO;
  const ld = jsonLd
    ? `\n  <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
    : '';
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(titulo)}</title>
  <meta name="description" content="${esc(descricao)}" />
  <link rel="canonical" href="${esc(url)}" />
  <meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1'}" />
  <meta name="theme-color" content="#111314" />
  <meta property="og:type" content="${ogType || 'website'}" />
  <meta property="og:site_name" content="FIHAN" />
  <meta property="og:locale" content="pt_BR" />
  <meta property="og:title" content="${esc(titulo)}" />
  <meta property="og:description" content="${esc(descricao)}" />
  <meta property="og:url" content="${esc(url)}" />
  <meta property="og:image" content="${esc(img)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(titulo)}" />
  <meta name="twitter:description" content="${esc(descricao)}" />
  <meta name="twitter:image" content="${esc(img)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />${ld}
${HEAD_LINKS}</head>
${TOPO}    <div class="inst-hero__content">
      ${overline}
      <h1 class="inst-hero__title inst-hero__title--wide t-display">${esc(h1)}</h1>
      ${lede ? `<p class="inst-hero__lede t-body-lg">${esc(lede)}</p>` : ''}
    </div>
  </div>

  <main>
${main}
  </main>

${RODAPE}`;
}

function organizacao() {
  return { '@type': 'Organization', '@id': `${SITE}/#organizacao`, name: 'FIHAN', url: `${SITE}/` };
}

/* ───── Projeto ───── */
function renderProjeto(c, { previa } = {}) {
  const d = c.dados || {};
  const caminho = `/trabalhos/${c.slug}`;
  const descricao = d.seoDescricao || c.resumo || d.lede || '';
  const link = safeUrl(d.linkUrl);

  const ficha = (d.ficha || []).filter((f) => f.rotulo && f.valor);
  const etapas = (d.etapas || []).filter((e) => e.titulo || e.texto);
  const itens = (d.itens || []).filter((i) => i.titulo || i.texto);
  const capa = safeUrl(c.capa);

  const secoes = [];

  if (ficha.length || capa) {
    secoes.push(`  <section class="dobra" aria-label="Ficha do projeto">
    ${ficha.length ? `<dl class="proj-ficha">
      ${ficha.map((f) => `<div><dt class="t-overline">${esc(f.rotulo)}</dt><dd class="t-body">${esc(f.valor)}</dd></div>`).join('\n      ')}
    </dl>` : ''}
    ${capa ? `<figure class="proj-capa">
      <img src="${esc(capa)}" alt="${esc(c.titulo)}" />
    </figure>` : ''}
  </section>`);
  }

  if (d.problemaTitulo || d.problemaTexto) {
    secoes.push(`  <section class="dobra dobra--tight">
    <hr class="dobra__regua" />
    <div class="dobra__head">
      <p class="t-overline">[ O problema ]</p>
      ${d.problemaTitulo ? `<h2 class="t-h1 t-h1--lg">${esc(d.problemaTitulo)}</h2>` : ''}
    </div>
    <div class="proj-texto">
      ${paragrafos(d.problemaTexto, 't-body-lg')}
    </div>
  </section>`);
  }

  if (etapas.length) {
    secoes.push(`  <section class="dobra dobra--tight">
    <hr class="dobra__regua" />
    <div class="dobra__head">
      <p class="t-overline">[ O desenvolvimento ]</p>
      ${d.devTitulo ? `<h2 class="t-h2">${esc(d.devTitulo)}</h2>` : ''}
    </div>
    <ol class="proj-etapas">
      ${etapas.map((e) => `<li class="proj-etapa">
        <h3 class="t-h3">${esc(e.titulo)}</h3>
        <p class="t-body">${esc(e.texto)}</p>
      </li>`).join('\n      ')}
    </ol>
  </section>`);
  }

  if (itens.length) {
    secoes.push(`  <section class="dobra dobra--dark">
    <div class="dobra__head">
      <p class="t-overline">[ A solução ]</p>
      ${d.solucaoTitulo ? `<h2 class="t-h2">${esc(d.solucaoTitulo)}</h2>` : ''}
    </div>
    <ul class="proj-lista">
      ${itens.map((i) => `<li>
        <h3 class="t-overline">${esc(i.titulo)}</h3>
        <p class="t-body">${esc(i.texto)}</p>
      </li>`).join('\n      ')}
    </ul>
  </section>`);
  }

  secoes.push(`  <section class="dobra">
    ${d.tecnica || link ? `<div class="proj-texto">
      ${d.tecnica ? `<p class="t-overline">[ Base técnica ]</p>
      ${paragrafos(d.tecnica, 't-body-lg')}` : ''}
      ${link ? `<p><a class="inst-btn inst-btn--dark" href="${esc(link)}"${linkAttrs(link)}>${esc(d.linkRotulo || 'Visitar o projeto')}</a></p>` : ''}
    </div>` : ''}
    <a class="proj-proximo" href="/trabalhos">
      <span class="t-overline">[ Trabalhos ]</span>
      <span class="t-h1 t-h1--lg">Ver todos os trabalhos</span>
    </a>
  </section>`);

  return pagina({
    titulo: `${c.titulo} | Trabalhos FIHAN`,
    descricao,
    caminho,
    imagem: c.capa,
    ogType: 'article',
    noindex: previa,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        organizacao(),
        {
          '@type': 'CreativeWork',
          '@id': `${SITE}${caminho}#trabalho`,
          name: c.titulo,
          description: descricao,
          url: SITE + caminho,
          sameAs: /^https?:/i.test(link) ? link : undefined,
          image: absoluta(c.capa) || undefined,
          inLanguage: 'pt-BR',
          creator: { '@id': `${SITE}/#organizacao` },
        },
      ],
    },
    overline: '<p class="t-overline"><a href="/trabalhos">[ Trabalhos ]</a></p>',
    h1: c.titulo,
    lede: d.lede || c.resumo,
    main: secoes.join('\n\n'),
  });
}

/* ───── Blog ───── */
function renderPost(c, { previa } = {}) {
  const d = c.dados || {};
  const caminho = `/blog/${c.slug}`;
  const descricao = d.seoDescricao || c.resumo || '';
  const capa = safeUrl(c.capa);
  const assinatura = [dataPorExtenso(c.published_at || c.updated_at), d.autor].filter(Boolean).join(' · ');

  const main = `  <article class="dobra">
    ${assinatura ? `<p class="t-overline">[ ${esc(assinatura)} ]</p>` : ''}
    ${capa ? `<figure class="proj-capa">
      <img src="${esc(capa)}" alt="${esc(c.titulo)}" />
    </figure>` : ''}
    <div class="proj-texto post-corpo">
      ${markdown(d.corpo)}
    </div>
    <a class="proj-proximo" href="/blog">
      <span class="t-overline">[ Blog ]</span>
      <span class="t-h1 t-h1--lg">Ver todos os artigos</span>
    </a>
  </article>`;

  return pagina({
    titulo: `${c.titulo} | Blog FIHAN`,
    descricao,
    caminho,
    imagem: c.capa,
    ogType: 'article',
    noindex: previa,
    jsonLd: {
      '@context': 'https://schema.org',
      '@graph': [
        organizacao(),
        {
          '@type': 'BlogPosting',
          '@id': `${SITE}${caminho}#artigo`,
          headline: c.titulo,
          description: descricao,
          url: SITE + caminho,
          image: absoluta(c.capa) || undefined,
          datePublished: dataIso(c.published_at),
          dateModified: dataIso(c.updated_at),
          inLanguage: 'pt-BR',
          author: d.autor ? { '@type': 'Person', name: d.autor } : { '@id': `${SITE}/#organizacao` },
          publisher: { '@id': `${SITE}/#organizacao` },
        },
      ],
    },
    overline: '<p class="t-overline"><a href="/blog">[ Blog ]</a></p>',
    h1: c.titulo,
    lede: c.resumo,
    main,
  });
}

function card(c, base) {
  const capa = safeUrl(c.capa);
  const data = base === '/blog' ? dataPorExtenso(c.published_at) : '';
  return `<a class="case-card" href="${base}/${esc(c.slug)}">
        <div class="case-card__image">${capa ? `<img src="${esc(capa)}" alt="" loading="lazy" />` : ''}</div>
        <div class="case-card__body">
          <p class="t-overline">[ ${esc(data || c.titulo)} ]</p>
          <h2 class="t-h3">${esc(c.titulo)}</h2>
          <p class="t-body">${esc(c.resumo)}</p>
        </div>
      </a>`;
}

function renderBlog(posts) {
  const main = `  <section class="dobra" aria-label="Artigos">
    <hr class="dobra__regua" />
    ${posts.length
    ? `<div class="case-grid">
      ${posts.map((p) => card(p, '/blog')).join('\n      ')}
    </div>`
    : '<p class="t-body-lg">Os primeiros artigos estão a caminho.</p>'}
  </section>`;

  return pagina({
    titulo: 'Blog | FIHAN',
    descricao: 'Artigos da FIHAN sobre negócio, marca e desenvolvimento de produtos digitais.',
    caminho: '/blog',
    noindex: !posts.length,
    overline: '<p class="t-overline">[ Blog ]</p>',
    h1: 'O que aprendemos construindo.',
    lede: 'Artigos sobre negócio, marca e desenvolvimento, escritos a partir do que a FIHAN constrói.',
    main,
  });
}

function renderNaoEncontrado(caminho, voltar) {
  return pagina({
    titulo: 'Página não encontrada | FIHAN',
    descricao: 'Esta página não existe ou saiu do ar.',
    caminho,
    noindex: true,
    overline: '<p class="t-overline">[ 404 ]</p>',
    h1: 'Página não encontrada.',
    lede: 'Este conteúdo não existe ou saiu do ar.',
    main: `  <section class="dobra">
    <p><a class="inst-btn inst-btn--dark" href="${voltar.href}">${voltar.rotulo}</a></p>
  </section>`,
  });
}

module.exports = { SITE, esc, safeUrl, markdown, card, renderProjeto, renderPost, renderBlog, renderNaoEncontrado };
