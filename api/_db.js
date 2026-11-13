const { createClient } = require('@libsql/client');

let client;
let ready;

function getClient() {
  if (!client) {
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return client;
}

// cria as tabelas se ainda não existirem — idempotente, roda uma vez por
// instância fria da function (ready fica em cache entre invocações quentes)
function ensureSchema() {
  if (!ready) {
    ready = getClient().batch([
      `CREATE TABLE IF NOT EXISTS leads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        nome TEXT NOT NULL,
        email TEXT NOT NULL,
        whatsapp TEXT,
        empresa TEXT,
        estagio TEXT,
        eixos TEXT,
        investimento TEXT,
        urgencia TEXT,
        mensagem TEXT
      )`,
      // projetos e posts do blog cadastrados pelo admin; os campos próprios
      // de cada tipo ficam em `dados` (JSON)
      `CREATE TABLE IF NOT EXISTS conteudos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        slug TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'rascunho',
        titulo TEXT NOT NULL,
        resumo TEXT,
        capa TEXT,
        dados TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        published_at TEXT,
        UNIQUE (tipo, slug)
      )`,
      // imagens enviadas pelo admin, servidas em /midia/<id>.<ext>
      `CREATE TABLE IF NOT EXISTS midias (
        id TEXT PRIMARY KEY,
        mime TEXT NOT NULL,
        bytes BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // quem entra no admin; a senha fica só como hash (api/_senha.js)
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        senha_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // tentativas de login erradas, para travar quem fica chutando senha
      `CREATE TABLE IF NOT EXISTS login_falhas (
        chave TEXT NOT NULL,
        quando TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      // Pré-Work do cliente: um por lead, aberto pelo link com o token.
      // `respostas` guarda o JSON enviado; `envio_id` torna o envio idempotente
      `CREATE TABLE IF NOT EXISTS pre_works (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lead_id INTEGER NOT NULL UNIQUE,
        token TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pendente',
        envio_id TEXT,
        respostas TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        enviado_at TEXT
      )`,
      // PDFs anexados no Pré-Work, presos ao pré-work que os recebeu
      `CREATE TABLE IF NOT EXISTS pre_work_arquivos (
        id TEXT PRIMARY KEY,
        pre_work_id INTEGER NOT NULL,
        nome TEXT NOT NULL,
        tamanho INTEGER NOT NULL,
        bytes BLOB NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    ], 'write').catch((err) => {
      // não deixa uma falha passageira presa no cache da instância
      ready = undefined;
      throw err;
    });
  }
  return ready;
}

module.exports = { getClient, ensureSchema };
