import { createHash, timingSafeEqual } from 'node:crypto';
import { UUID, json } from './http.js';

const NAME = /^[A-Za-z0-9._-]{1,40}$/;
const hash = text => createHash('sha256').update(text).digest();

/* ADMIN_LOGINS holds one "username:password" pair per admin, separated by commas or new lines.
   Usernames use letters, numbers, dots, dashes or underscores; passwords cannot contain commas. */
export function parseLogins(value) {
  const logins = new Map();
  for (const entry of String(value || '').split(/[\n,]/)) {
    const line = entry.trim();
    const at = line.indexOf(':');
    if (at < 1) continue;
    const name = line.slice(0, at).trim();
    const password = line.slice(at + 1).trim();
    if (NAME.test(name) && password) logins.set(name.toLowerCase(), { name, password });
  }
  return logins;
}

/* Returns the signed-in admin's username, or null. The password check takes the same time
   whether or not the username exists. */
export function adminFrom(request, logins) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ') || header.length > 2048) return null;
  const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
  const at = decoded.indexOf(':');
  if (at < 1) return null;
  const login = logins.get(decoded.slice(0, at).toLowerCase());
  const match = timingSafeEqual(hash(decoded.slice(at + 1)), hash(login ? login.password : '\0'));
  return login && match ? login.name : null;
}

/* The separate password for deleting sessions (DELETE_PASSWORD), or '' when deleting is switched off. */
export function deletePassword(env) {
  return String(env.DELETE_PASSWORD || '').trim();
}

/* Compares a typed password with the expected one in constant time. */
export function samePassword(given, expected) {
  if (typeof given !== 'string' || !expected || given.length > 200) return false;
  return timingSafeEqual(hash(given.trim()), hash(expected));
}

export const challenge = { 'WWW-Authenticate': 'Basic realm="YME admins", charset="UTF-8"' };

/* For admin-only requests: { admin } when signed in, otherwise { response } to send back. */
export function signedIn(request, env) {
  const logins = parseLogins(env.ADMIN_LOGINS);
  if (!logins.size) return { response: json(503, { error: 'No admin logins are set. Add ADMIN_LOGINS in Cloudflare and redeploy.' }) };
  const admin = adminFrom(request, logins);
  if (!admin) return { response: json(401, { error: 'Sign in with your YME admin username and password.' }, challenge) };
  return { admin };
}

const MAX_DELETE = 500; /* more than the admin lists ever show at once */

/* Checks a delete request ({ ids, password }): returns the ids to delete, or a Response refusing it. */
export function deleteIds(data, env) {
  if (!samePassword(data?.password, deletePassword(env))) return json(403, { error: 'That delete password is not right. Nothing was deleted.' });
  const ids = Array.isArray(data.ids) ? [...new Set(data.ids.map(id => (typeof id === 'string' ? id.toLowerCase() : '')))] : [];
  if (!ids.length || ids.length > MAX_DELETE || !ids.every(id => UUID.test(id))) return json(400, { error: 'Choose at least one to delete.' });
  return ids;
}
