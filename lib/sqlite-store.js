import { DatabaseSync } from 'node:sqlite';

/* Sessions stored in a local SQLite file, for `node server.mjs`. Same methods as lib/database.js. */
export function createSqliteStore(file) {
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT, online INTEGER NOT NULL DEFAULT 0,
    place TEXT NOT NULL DEFAULT '', street TEXT NOT NULL DEFAULT '', town TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '', created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE INDEX IF NOT EXISTS sessions_date ON sessions (date);
    CREATE TABLE IF NOT EXISTS signups (
    id TEXT PRIMARY KEY, session_id TEXT, session_title TEXT NOT NULL DEFAULT '', session_date TEXT, session_start TEXT,
    name TEXT NOT NULL, email TEXT NOT NULL, grade TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE UNIQUE INDEX IF NOT EXISTS signups_once ON signups (COALESCE(session_id, 'notify'), lower(email));`);
  const columns = 'id, type, title, date, start_time AS start, end_time AS "end", online, place, street, town, description';
  const upcoming = db.prepare(`SELECT ${columns} FROM sessions WHERE date >= date('now', '-1 day') ORDER BY date, start_time LIMIT 200`);
  const recent = db.prepare(`SELECT ${columns}, created_by, created_at FROM sessions WHERE date >= date('now', '-30 day') ORDER BY date, start_time LIMIT 500`);
  const insert = db.prepare(`INSERT OR IGNORE INTO sessions
    (id, type, title, date, start_time, end_time, online, place, street, town, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const remove = db.prepare('DELETE FROM sessions WHERE id = ?');
  const openSession = db.prepare(`SELECT id, title, date, start_time AS start FROM sessions WHERE id = ? AND date >= date('now', '-1 day')`);
  const insertSignup = db.prepare(`INSERT OR IGNORE INTO signups
    (id, session_id, session_title, session_date, session_start, name, email, grade, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const listSignups = db.prepare(`SELECT id, session_id, session_title, session_date, session_start, name, email, grade, note, created_at
    FROM signups ORDER BY created_at DESC, rowid DESC LIMIT 2000`);
  const removeSignup = db.prepare('DELETE FROM signups WHERE id = ?');
  /* deletes in one transaction; returns how many were still there */
  const removeAll = (statement, ids) => {
    let removed = 0;
    db.exec('BEGIN');
    try {
      for (const id of ids) removed += statement.run(id).changes;
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    return removed;
  };
  const tidy = row => ({ ...row, end: row.end || null, online: Boolean(row.online) });
  return {
    async upcoming() { return upcoming.all().map(tidy); },
    async recent() { return recent.all().map(tidy); },
    async add(s) {
      const result = insert.run(s.id, s.type, s.title, s.date, s.start, s.end, s.online ? 1 : 0, s.place, s.street, s.town, s.description, s.createdBy);
      return result.changes ? 'added' : 'exists';
    },
    async remove(ids) { return removeAll(remove, ids); },
    async session(id) { const row = openSession.get(id); return row ? { ...row } : null; },
    async addSignup(s) {
      const result = insertSignup.run(s.id, s.session, s.sessionTitle, s.sessionDate, s.sessionStart, s.name, s.email, s.grade, s.note);
      return result.changes ? 'added' : 'exists';
    },
    /* created_at as an ISO time, like Neon's */
    async signups() { return listSignups.all().map(row => ({ ...row, created_at: row.created_at.replace(' ', 'T') + 'Z' })); },
    async removeSignups(ids) { return removeAll(removeSignup, ids); },
    close() { db.close(); }
  };
}
