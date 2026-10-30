import { deleteIds, deletePassword, signedIn } from './auth.js';
import { UUID, databaseFailure, isJson, json, readJson, sameOrigin } from './http.js';

export const GRADES = ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'Other'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Trims typed text and checks its length; notes keep their line breaks. Returns null if not allowed. */
function text(value, max, lines = false) {
  if (value === undefined || value === null) value = '';
  if (typeof value !== 'string' || value.includes('\0')) return null;
  value = lines
    ? value.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    : value.trim().replace(/\s+/g, ' ');
  return value.length > max ? null : value;
}

/* Returns a cleaned sign-up, or null if anything is missing or invalid. session is null for
   "Tell me when new sessions open". */
export function validSignup(x) {
  if (!x || typeof x !== 'object') return null;
  if (typeof x.id !== 'string' || !UUID.test(x.id)) return null;
  const session = x.session === undefined || x.session === null || x.session === '' ? null : x.session;
  if (session !== null && (typeof session !== 'string' || !UUID.test(session))) return null;
  const name = text(x.name, 100), email = text(x.email, 254), grade = text(x.grade, 10), note = text(x.note, 500, true);
  if (!name || !email || !EMAIL.test(email) || grade === null || note === null) return null;
  if (grade && !GRADES.includes(grade)) return null;
  return { id: x.id.toLowerCase(), session: session && session.toLowerCase(), name, email, grade, note };
}

/* POST: anyone signs up from the website (for a session, or to hear about new ones).
   GET: signed-in admins see every sign-up. DELETE: admins remove some, with the DELETE_PASSWORD. */
export function createSignupsHandler({ env = process.env, storeFactory } = {}) {
  return async function signups(request) {
    const method = request.method;
    if (!['GET', 'POST', 'DELETE'].includes(method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
    if (!env.DATABASE_URL) return json(503, { error: 'The database is not connected. Set DATABASE_URL in Cloudflare and redeploy.' });
    if (method !== 'POST') {
      const gate = signedIn(request, env);
      if (gate.response) return gate.response;
    }
    try {
      const store = storeFactory(env.DATABASE_URL);
      if (method === 'GET') return json(200, { canDelete: Boolean(deletePassword(env)), signups: await store.signups() });
      if (!sameOrigin(request)) return json(403, { error: method === 'POST' ? 'Please sign up on the YME website.' : 'Please manage sign-ups from the YME admin page.' });
      if (!isJson(request)) return json(415, { error: 'Please use the form on the website.' });
      if (method === 'DELETE' && !deletePassword(env)) return json(503, { error: 'Deleting is switched off. Add DELETE_PASSWORD in Cloudflare and redeploy.' });
      let data;
      try { data = await readJson(request); } catch { return json(400, { error: 'We could not read that request. Please try again.' }); }
      if (method === 'DELETE') {
        const ids = deleteIds(data, env);
        return ids instanceof Response ? ids : json(200, { removed: await store.removeSignups(ids) });
      }
      /* the form has a hidden box people never see; anything typed there came from a bot */
      if (typeof data?._honey === 'string' && data._honey.trim()) return json(200, { saved: true });
      const signup = validSignup(data);
      if (!signup) return json(400, { error: 'Please check your name and email address.' });
      let session = null;
      if (signup.session) {
        session = await store.session(signup.session);
        if (!session) return json(404, { error: "That session isn't open for sign-ups anymore.", closed: true });
      }
      /* the same answer whether or not this email had already signed up, so it reveals nothing */
      await store.addSignup({
        ...signup, sessionTitle: session ? session.title : '', sessionDate: session ? session.date : null, sessionStart: session ? session.start : null
      });
      return json(200, { saved: true });
    } catch (error) {
      return databaseFailure(error, {
        GET: 'Sign-ups are temporarily unavailable.',
        POST: 'Signing up is temporarily unavailable. Please try again.',
        DELETE: 'Deleting is temporarily unavailable. Please try again.'
      }[method]);
    }
  };
}
