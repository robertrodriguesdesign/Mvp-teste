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

// cria a tabela se ainda não existir — idempotente, roda uma vez por
// instância fria da function (ready fica em cache entre invocações quentes)
function ensureSchema() {
  if (!ready) {
    ready = getClient().execute(`
      CREATE TABLE IF NOT EXISTS leads (
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
      )
    `);
  }
  return ready;
}

module.exports = { getClient, ensureSchema };
