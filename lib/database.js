import { neon } from '@neondatabase/serverless';

/* Sessions stored in Neon (Postgres). Used on Cloudflare (worker.js); server.mjs uses lib/sqlite-store.js locally. */
export function createStore(connectionString) {
  const sql = neon(connectionString);
  return {
    /* public list: from yesterday on (the page hides each one after its own day, in the visitor's time zone) */
    async upcoming() {
      return sql`
        SELECT id, type, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start_time, 'HH24:MI') AS start,
          to_char(end_time, 'HH24:MI') AS "end", online, place, street, town, description
        FROM sessions WHERE date >= CURRENT_DATE - 1
        ORDER BY date, start_time LIMIT 200`;
    },
    /* admin list: also the last 30 days, with who added each one */
    async recent() {
      return sql`
        SELECT id, type, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start_time, 'HH24:MI') AS start,
          to_char(end_time, 'HH24:MI') AS "end", online, place, street, town, description, created_by, created_at
        FROM sessions WHERE date >= CURRENT_DATE - 30
        ORDER BY date, start_time LIMIT 500`;
    },
    /* the id comes from the admin page, so a retried save never adds the session twice */
    async add(s) {
      const rows = await sql`
        INSERT INTO sessions (id, type, title, date, start_time, end_time, online, place, street, town, description, created_by)
        VALUES (${s.id}, ${s.type}, ${s.title}, ${s.date}, ${s.start}, ${s.end}, ${s.online}, ${s.place}, ${s.street}, ${s.town}, ${s.description}, ${s.createdBy})
        ON CONFLICT (id) DO NOTHING RETURNING id`;
      return rows.length ? 'added' : 'exists';
    },
    /* an open session (not yet past) by id, for sign-ups */
    async session(id) {
      const rows = await sql`
        SELECT id, title, to_char(date, 'YYYY-MM-DD') AS date, to_char(start_time, 'HH24:MI') AS start
        FROM sessions WHERE id = ${id} AND date >= CURRENT_DATE - 1`;
      return rows[0] || null;
    },
    /* a repeat sign-up (same email, same session) is quietly skipped */
    async addSignup(s) {
      const rows = await sql`
        INSERT INTO signups (id, session_id, session_title, session_date, session_start, name, email, grade, note)
        VALUES (${s.id}, ${s.session}, ${s.sessionTitle}, ${s.sessionDate}, ${s.sessionStart}, ${s.name}, ${s.email}, ${s.grade}, ${s.note})
        ON CONFLICT DO NOTHING RETURNING id`;
      return rows.length ? 'added' : 'exists';
    },
    async signups() {
      return sql`
        SELECT id, session_id, session_title, to_char(session_date, 'YYYY-MM-DD') AS session_date,
          to_char(session_start, 'HH24:MI') AS session_start, name, email, grade, note, created_at
        FROM signups ORDER BY created_at DESC LIMIT 2000`;
    },
    async removeSignups(ids) {
      const rows = await sql`DELETE FROM signups WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
      return rows.length;
    },
    /* removes every listed session; returns how many were still there */
    async remove(ids) {
      const rows = await sql`DELETE FROM sessions WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
      return rows.length;
    }
  };
}
