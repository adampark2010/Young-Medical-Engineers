import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSignupsHandler, validSignup } from '../lib/signups.js';

const SITE = 'https://www.medengineers.org';
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one', DELETE_PASSWORD: 'delete-me' };
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');
const OPEN = randomUUID(), PAST = randomUUID();

function memoryStore() {
  const rows = new Map();
  const sessions = { [OPEN]: { id: OPEN, title: 'Build a Stethoscope', date: '2026-11-14', start: '10:00' } };
  return {
    rows,
    async session(id) { return sessions[id] || null; },
    async addSignup(s) {
      const key = (s.session || 'notify') + '|' + s.email.toLowerCase();
      if (rows.has(s.id) || [...rows.values()].some(r => (r.session || 'notify') + '|' + r.email.toLowerCase() === key)) return 'exists';
      rows.set(s.id, s);
      return 'added';
    },
    async signups() { return [...rows.values()]; },
    async removeSignups(ids) { return ids.filter(id => rows.delete(id)).length; }
  };
}
function setup(overrides = {}) {
  const store = memoryStore();
  return { store, handler: createSignupsHandler({ env: { ...env, ...overrides }, storeFactory: () => store }) };
}
function request(method, { body, auth = null, origin = SITE, type = 'application/json' } = {}) {
  const headers = new Headers();
  if (auth) headers.set('authorization', auth);
  if (origin) headers.set('origin', origin);
  if (type) headers.set('content-type', type);
  return new Request(`${SITE}/api/signups`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const signup = (extra = {}) => ({ id: randomUUID(), session: OPEN, name: '  Ada   Lovelace ', email: 'ada@example.com', grade: '10th', note: '', ...extra });

test('a visitor signs up for a session; repeats are not saved twice', async () => {
  const { store, handler } = setup();
  const first = signup();
  const res = await handler(request('POST', { body: first }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { saved: true });
  const row = store.rows.get(first.id);
  assert.equal(row.name, 'Ada Lovelace');
  assert.equal(row.sessionTitle, 'Build a Stethoscope', 'the session title comes from the database, not the browser');
  assert.equal(row.sessionDate, '2026-11-14');
  assert.equal((await handler(request('POST', { body: first }))).status, 200, 'a retry is fine');
  const again = await handler(request('POST', { body: signup({ email: 'ADA@example.com' }) }));
  assert.deepEqual(await again.json(), { saved: true }, 'the same answer for an email that already signed up');
  assert.equal(store.rows.size, 1);
  const notify = signup({ session: null, grade: '', note: 'Line one\r\n\r\n\r\nLine   two' });
  assert.equal((await handler(request('POST', { body: notify }))).status, 200);
  assert.equal(store.rows.get(notify.id).sessionTitle, '');
  assert.equal(store.rows.get(notify.id).note, 'Line one\n\nLine two');
  assert.equal(store.rows.size, 2, 'the "tell me" list is separate from each session');
});

test('sign-ups must come from the website, as JSON, for an open session', async () => {
  const { store, handler } = setup();
  assert.equal((await handler(request('POST', { body: signup(), origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(request('POST', { body: signup(), origin: null }))).status, 403);
  assert.equal((await handler(request('POST', { body: signup(), type: 'text/plain' }))).status, 415);
  const closed = await handler(request('POST', { body: signup({ session: PAST }) }));
  assert.equal(closed.status, 404);
  assert.equal((await closed.json()).closed, true);
  assert.equal(store.rows.size, 0);
});

test('invalid sign-ups are refused; the hidden bot box is ignored quietly', async () => {
  const { store, handler } = setup();
  const bad = [
    { id: 'nope' }, { session: 'nope' }, { name: '  ' }, { name: 'x'.repeat(101) }, { email: 'not-an-email' }, { email: 'a@b' },
    { email: `${'x'.repeat(250)}@example.com` }, { grade: '13th' }, { grade: 7 }, { note: 'x'.repeat(501) }, { name: 'a\0b' }
  ];
  for (const change of bad) assert.equal((await handler(request('POST', { body: signup(change) }))).status, 400, JSON.stringify(change).slice(0, 60));
  const bot = await handler(request('POST', { body: signup({ _honey: 'http://spam.example' }) }));
  assert.equal(bot.status, 200);
  assert.equal(store.rows.size, 0, 'nothing saved from a bot');
  assert.equal(validSignup(signup({ grade: '', note: undefined })).note, '');
});

test('admins list sign-ups and delete them with the delete password', async () => {
  const { store, handler } = setup();
  const [a, b] = [signup(), signup({ session: null, email: 'b@example.com' })];
  for (const s of [a, b]) await handler(request('POST', { body: s }));
  assert.equal((await handler(request('GET'))).status, 401);
  const list = await (await handler(request('GET', { auth: basic('derrick', 'pass-one') }))).json();
  assert.equal(list.signups.length, 2);
  assert.equal(list.canDelete, true);
  const del = (body, extra = {}) => handler(request('DELETE', { body, auth: basic('derrick', 'pass-one'), ...extra }));
  assert.equal((await del({ ids: [a.id], password: 'delete-me' }, { auth: null })).status, 401);
  assert.equal((await del({ ids: [a.id], password: 'delete-me' }, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await del({ ids: [a.id], password: 'pass-one' })).status, 403);
  assert.equal((await del({ ids: ['nope'], password: 'delete-me' })).status, 400);
  assert.equal(store.rows.size, 2);
  assert.deepEqual(await (await del({ ids: [a.id, b.id], password: 'delete-me' })).json(), { removed: 2 });
  assert.equal(store.rows.size, 0);
  const off = setup({ DELETE_PASSWORD: '' });
  assert.equal((await off.handler(request('DELETE', { body: { ids: [a.id], password: '' }, auth: basic('derrick', 'pass-one') }))).status, 503);
});

test('sign-up setup problems give clear messages', async () => {
  assert.equal((await setup({ DATABASE_URL: '' }).handler(request('POST', { body: signup() }))).status, 503);
  const broken = createSignupsHandler({ env, storeFactory: () => ({ session() { throw Object.assign(new Error('x'), { code: '42P01' }); } }) });
  const missing = await broken(request('POST', { body: signup() }));
  assert.equal(missing.status, 503);
  assert.match((await missing.json()).error, /schema\.sql/);
  const down = createSignupsHandler({ env, storeFactory: () => ({ session() { throw new Error('reset'); } }) });
  assert.match((await (await down(request('POST', { body: signup() }))).json()).error, /Signing up is temporarily unavailable/);
  assert.equal((await setup().handler(new Request(`${SITE}/api/signups`, { method: 'PUT' }))).status, 405);
});
