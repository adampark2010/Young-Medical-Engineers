import { deleteIds, deletePassword, signedIn } from './auth.js';
import { UUID, databaseFailure, isJson, json, readJson, sameOrigin } from './http.js';

const TYPES = ['Talk', 'Hands-On Demo', 'Design Challenge'];
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const LIMITS = { title: 120, place: 120, street: 160, town: 120, description: 300 };

/* Returns a cleaned session, or null if anything is missing or invalid. */
export function validSession(x) {
  if (!x || typeof x !== 'object') return null;
  if (typeof x.id !== 'string' || !UUID.test(x.id) || !TYPES.includes(x.type)) return null;
  if (typeof x.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x.date)) return null;
  const day = Date.parse(`${x.date}T00:00:00Z`);
  if (!Number.isFinite(day) || new Date(day).toISOString().slice(0, 10) !== x.date) return null;
  if (typeof x.start !== 'string' || !TIME.test(x.start)) return null;
  const end = x.end === undefined || x.end === null || x.end === '' ? null : x.end;
  if (end !== null && (typeof end !== 'string' || !TIME.test(end) || end <= x.start)) return null;
  if (typeof x.online !== 'boolean') return null;
  const session = { id: x.id.toLowerCase(), type: x.type, date: x.date, start: x.start, end, online: x.online };
  for (const [key, max] of Object.entries(LIMITS)) {
    const value = x[key] === undefined ? '' : x[key];
    if (typeof value !== 'string' || value.includes('\0')) return null;
    session[key] = value.trim().replace(/\s+/g, ' ');
    if (session[key].length > max) return null;
  }
  if (!session.title) return null;
  if (session.online) session.place = session.street = session.town = '';
  else if (!session.place && !session.street) return null;
  return session;
}

/* GET: public list of upcoming sessions (or, signed in with ?scope=admin, the admin list).
   POST: add a session. DELETE: remove one or more, which also needs the separate DELETE_PASSWORD.
   Both need an admin sign-in and must come from this website. */
export function createSessionsHandler({ env = process.env, storeFactory } = {}) {
  return async function sessions(request) {
    const method = request.method;
    if (!['GET', 'POST', 'DELETE'].includes(method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
    if (!env.DATABASE_URL) return json(503, { error: 'The database is not connected. Set DATABASE_URL in Cloudflare and redeploy.' });
    const url = new URL(request.url);
    const adminOnly = method !== 'GET' || url.searchParams.get('scope') === 'admin';
    let admin = null;
    if (adminOnly) {
      const gate = signedIn(request, env);
      if (gate.response) return gate.response;
      admin = gate.admin;
    }
    try {
      const store = storeFactory(env.DATABASE_URL);
      if (method === 'GET') {
        return adminOnly
          ? json(200, { admin, canDelete: Boolean(deletePassword(env)), sessions: await store.recent() })
          : json(200, { sessions: await store.upcoming() });
      }
      if (!sameOrigin(request)) return json(403, { error: 'Please manage sessions from the YME admin page.' });
      if (!isJson(request)) return json(415, { error: 'Please use the admin page.' });
      if (method === 'DELETE' && !deletePassword(env)) return json(503, { error: 'Deleting is switched off. Add DELETE_PASSWORD in Cloudflare and redeploy.' });
      let data;
      try { data = await readJson(request); } catch { return json(400, { error: 'We could not read that request. Please try again.' }); }
      if (method === 'DELETE') {
        const ids = deleteIds(data, env);
        return ids instanceof Response ? ids : json(200, { removed: await store.remove(ids) });
      }
      const session = validSession(data);
      if (!session) return json(400, { error: 'Please check the session: type, title, date, start time (the end must be after the start), and a place or Online.' });
      const result = await store.add({ ...session, createdBy: admin });
      return json(result === 'added' ? 201 : 200, { saved: true, id: session.id });
    } catch (error) {
      return databaseFailure(error, {
        GET: 'Sessions are temporarily unavailable.',
        POST: 'Saving is temporarily unavailable. Your entry is still in the form; please try again.',
        DELETE: 'Deleting is temporarily unavailable. Please try again.'
      }[method]);
    }
  };
}
