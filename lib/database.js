import { neon } from '@neondatabase/serverless';

/* Sessions, sign-ups and form submissions stored in Neon (Postgres). Used on Cloudflare (worker.js); server.mjs uses lib/sqlite-store.js locally. */
export function createStore(connectionString) {
  /* a common setup slip is pasting only the password; say so clearly, without repeating the value */
  if (!/^postgres(?:ql)?:\/\/[^\s/]+@[^\s/]+\/\S+$/i.test(String(connectionString).trim())) {
    throw Object.assign(new Error('DATABASE_URL is not a full connection string'), { code: 'BAD_DATABASE_URL' });
  }
  const sql = neon(String(connectionString).trim());
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
    /* a retry with the same id is saved once */
    async addFormSubmission(f) {
      await sql`
        INSERT INTO form_submissions (id, form, fields) VALUES (${f.id}, ${f.form}, ${JSON.stringify(f.fields)}::jsonb)
        ON CONFLICT (id) DO NOTHING`;
    },
    async formSubmissions() {
      return sql`SELECT id, form, fields, created_at FROM form_submissions ORDER BY created_at DESC LIMIT 2000`;
    },
    async removeFormSubmissions(ids) {
      const rows = await sql`DELETE FROM form_submissions WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
      return rows.length;
    },
    /* the Articles pages: newest date first */
    async posts(kinds) {
      return sql`
        SELECT id, kind, data, created_by, created_at FROM posts WHERE kind = ANY(${kinds})
        ORDER BY data->>'date' DESC, created_at DESC LIMIT 500`;
    },
    /* adds a post, or saves changes to it when the id is already there */
    async savePost(p) {
      await sql`
        INSERT INTO posts (id, kind, data, created_by) VALUES (${p.id}, ${p.kind}, ${JSON.stringify(p.data)}::jsonb, ${p.createdBy})
        ON CONFLICT (id) DO UPDATE SET kind = EXCLUDED.kind, data = EXCLUDED.data, updated_at = NOW()`;
    },
    async removePosts(ids) {
      const rows = await sql`DELETE FROM posts WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
      return rows.length;
    },
    /* pictures uploaded for the Articles pages */
    async saveImage(i) {
      await sql`INSERT INTO images (id, type, data, bytes, created_by) VALUES (${i.id}, ${i.type}, ${i.data}, ${i.bytes}, ${i.createdBy})`;
    },
    async image(id) {
      const rows = await sql`SELECT type, data FROM images WHERE id = ${id}`;
      return rows[0] || null;
    },
    /* removes every listed session; returns how many were still there */
    async remove(ids) {
      const rows = await sql`DELETE FROM sessions WHERE id = ANY(${ids}::uuid[]) RETURNING id`;
      return rows.length;
    }
  };
}
