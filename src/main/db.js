const Database = require('better-sqlite3')

function createDb(dbPath) {
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      color      TEXT NOT NULL,
      icon       TEXT,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS todos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      memo         TEXT,
      due_date     TEXT,
      persona_id   INTEGER REFERENCES personas(id) ON DELETE SET NULL,
      completed    INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
  `)

  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('notify_time', '["08:00"]')`).run()
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('slack_webhook_url', '')`).run()
  db.prepare(`INSERT OR IGNORE INTO settings (key, value) VALUES ('default_persona_id', '')`).run()

  return db
}

module.exports = { createDb }
