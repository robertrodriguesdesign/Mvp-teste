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
    ], 'write').catch((err) => {
      // não deixa uma falha passageira presa no cache da instância
      ready = undefined;
      throw err;
    });
  }
  return ready;
}

module.exports = { getClient, ensureSchema };
