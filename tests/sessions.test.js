import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createSessionsHandler, validSession } from '../lib/sessions.js';
import { parseLogins, adminFrom } from '../lib/auth.js';
import { createAdminHandler } from '../lib/admin.js';

const SITE = 'https://www.medengineers.org';
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one,\nadam:pass:two', DELETE_PASSWORD: ' delete-me ' };
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');

function memoryStore() {
  const rows = new Map();
  return {
    rows,
    async upcoming() { return [...rows.values()].map(({ createdBy, ...s }) => s); },
    async recent() { return [...rows.values()].map(({ createdBy, ...s }) => ({ ...s, created_by: createdBy })); },
    async add(s) { if (rows.has(s.id)) return 'exists'; rows.set(s.id, s); return 'added'; },
    async remove(ids) { return ids.filter(id => rows.delete(id)).length; }
  };
}
function setup(overrides = {}) {
  const store = memoryStore();
  const handler = createSessionsHandler({ env: { ...env, ...overrides }, storeFactory: () => store });
  return { store, handler };
}
function request(method, { body, auth = basic('derrick', 'pass-one'), origin = SITE, type = 'application/json', query = '' } = {}) {
  const headers = new Headers();
  if (auth) headers.set('authorization', auth);
  if (origin) headers.set('origin', origin);
  if (type) headers.set('content-type', type);
  return new Request(`${SITE}/api/sessions${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const session = (extra = {}) => ({
  id: randomUUID(), type: 'Hands-On Demo', title: '  Build a   Stethoscope ', date: '2026-11-14', start: '10:00', end: '11:30',
  online: false, place: 'Dunlap Public Library', street: '302 S 1st St', town: 'Dunlap, IL', description: '', ...extra
});

test('admin logins: several people, commas or new lines, passwords may contain colons', () => {
  const logins = parseLogins('derrick:pass-one,\nadam:pass:two, bad name:x, :nobody, empty:');
  assert.deepEqual([...logins.keys()], ['derrick', 'adam']);
  assert.equal(logins.get('adam').password, 'pass:two');
  const check = auth => adminFrom(new Request(SITE, { headers: auth ? { authorization: auth } : {} }), logins);
  assert.equal(check(basic('derrick', 'pass-one')), 'derrick');
  assert.equal(check(basic('DERRICK', 'pass-one')), 'derrick');
  assert.equal(check(basic('adam', 'pass:two')), 'adam');
  assert.equal(check(basic('derrick', 'wrong')), null);
  assert.equal(check(basic('nobody', 'pass-one')), null);
  assert.equal(check('Bearer abc'), null);
  assert.equal(check(null), null);
});

test('anyone can read upcoming sessions; the admin list needs a sign-in', async () => {
  const { store, handler } = setup();
  await store.add({ ...validSession(session()), createdBy: 'derrick' });
  const open = await handler(request('GET', { auth: null, origin: null, type: null }));
  assert.equal(open.status, 200);
  const body = await open.json();
  assert.equal(body.sessions.length, 1);
  assert.equal(body.sessions[0].created_by, undefined);
  const locked = await handler(request('GET', { auth: null, query: '?scope=admin' }));
  assert.equal(locked.status, 401);
  assert.match(locked.headers.get('www-authenticate'), /Basic realm="YME admins"/);
  const adminList = await (await handler(request('GET', { auth: basic('adam', 'pass:two'), query: '?scope=admin' }))).json();
  assert.equal(adminList.admin, 'adam');
  assert.equal(adminList.canDelete, true);
  assert.equal(adminList.sessions[0].created_by, 'derrick');
});

test('adding a session: needs a sign-in, this website, and JSON; saves once', async () => {
  const { store, handler } = setup();
  const s = session();
  assert.equal((await handler(request('POST', { body: s, auth: null }))).status, 401);
  assert.equal((await handler(request('POST', { body: s, auth: basic('derrick', 'nope') }))).status, 401);
  assert.equal((await handler(request('POST', { body: s, origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(request('POST', { body: s, origin: null }))).status, 403);
  assert.equal((await handler(request('POST', { body: s, type: 'text/plain' }))).status, 415);
  const saved = await handler(request('POST', { body: s }));
  assert.equal(saved.status, 201);
  const row = store.rows.get(s.id);
  assert.equal(row.title, 'Build a Stethoscope');
  assert.equal(row.createdBy, 'derrick');
  assert.equal((await handler(request('POST', { body: s }))).status, 200, 'a retry with the same id is not added twice');
  assert.equal(store.rows.size, 1);
});

test('invalid sessions are refused', async () => {
  const { store, handler } = setup();
  const bad = [
    { id: 'not-a-uuid' }, { type: 'Party' }, { title: '   ' }, { title: 'x'.repeat(121) }, { title: 'a\0b' },
    { date: '2026-02-30' }, { date: '14/11/2026' }, { start: '25:00' }, { start: '9:00' }, { end: '09:00' }, { end: '10:00' },
    { online: 'yes' }, { place: '', street: '' }, { description: 'x'.repeat(301) }
  ];
  for (const change of bad) {
    const res = await handler(request('POST', { body: session(change) }));
    assert.equal(res.status, 400, JSON.stringify(change));
  }
  assert.equal(store.rows.size, 0);
  const online = session({ online: true, place: 'ignored', street: '', town: '' });
  assert.equal((await handler(request('POST', { body: online }))).status, 201);
  assert.equal(store.rows.get(online.id).place, '');
  const noEnd = session({ end: null });
  assert.equal((await handler(request('POST', { body: noEnd }))).status, 201);
});

test('deleting sessions: several at once, only with the delete password', async () => {
  const { store, handler } = setup();
  const [a, b, c] = [session(), session(), session()];
  for (const s of [a, b, c]) await handler(request('POST', { body: s }));
  const del = (body, extra = {}) => handler(request('DELETE', { body, ...extra }));
  const both = { ids: [a.id, b.id.toUpperCase(), a.id], password: 'delete-me' };
  assert.equal((await del(both, { auth: null })).status, 401, 'needs an admin sign-in');
  assert.equal((await del(both, { origin: 'https://evil.example' })).status, 403, 'needs this website');
  assert.equal((await del(both, { type: 'text/plain' })).status, 415);
  for (const password of [undefined, '', 'wrong', 'pass-one', 'x'.repeat(201)]) {
    const res = await del({ ...both, password });
    assert.equal(res.status, 403, `password ${JSON.stringify(password)}`);
    assert.match((await res.json()).error, /Nothing was deleted/);
  }
  assert.equal(store.rows.size, 3, 'nothing is deleted without the right password');
  for (const ids of [undefined, [], 'abc', ['nope'], [a.id, 7], Array.from({ length: 501 }, () => randomUUID())]) {
    assert.equal((await del({ ids, password: 'delete-me' })).status, 400, JSON.stringify(ids)?.slice(0, 40));
  }
  const ok = await del(both, { auth: basic('adam', 'pass:two') });
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { removed: 2 }, 'repeated and upper-case ids count once');
  assert.deepEqual([...store.rows.keys()], [c.id]);
  assert.deepEqual(await (await del(both)).json(), { removed: 0 }, 'deleting again is harmless');
  const off = setup({ DELETE_PASSWORD: '  ' });
  await off.handler(request('POST', { body: c }));
  const switchedOff = await off.handler(request('DELETE', { body: { ids: [c.id], password: '' } }));
  assert.equal(switchedOff.status, 503);
  assert.match((await switchedOff.json()).error, /DELETE_PASSWORD/);
  assert.equal(off.store.rows.size, 1);
  assert.equal((await (await off.handler(request('GET', { query: '?scope=admin' }))).json()).canDelete, false);
});

test('setup problems give clear messages', async () => {
  const noDb = await setup({ DATABASE_URL: '' }).handler(request('GET', { auth: null }));
  assert.equal(noDb.status, 503);
  assert.match((await noDb.json()).error, /DATABASE_URL/);
  const { handler } = setup({ ADMIN_LOGINS: '' });
  assert.equal((await handler(request('GET', { auth: null }))).status, 200, 'the public list still works');
  const noLogins = await handler(request('POST', { body: session() }));
  assert.equal(noLogins.status, 503);
  assert.match((await noLogins.json()).error, /ADMIN_LOGINS/);
  const broken = createSessionsHandler({ env, storeFactory: () => ({ upcoming() { throw Object.assign(new Error('x'), { code: '42P01' }); } }) });
  const missingTable = await broken(request('GET', { auth: null }));
  assert.equal(missingTable.status, 503);
  assert.match((await missingTable.json()).error, /schema\.sql/);
  const down = createSessionsHandler({ env, storeFactory: () => ({ remove() { throw new Error('connection reset'); } }) });
  const failed = await down(request('DELETE', { body: { ids: [randomUUID()], password: 'delete-me' } }));
  assert.equal(failed.status, 503);
  assert.match((await failed.json()).error, /Deleting is temporarily unavailable/);
  assert.equal((await handler(new Request(`${SITE}/api/sessions`, { method: 'PUT' }))).status, 405);
});

test('the admin page asks for a sign-in, then shows who is signed in', async () => {
  const admin = createAdminHandler({ env: { ADMIN_LOGINS: 'derrick:pass-one' } });
  const locked = await admin(new Request(`${SITE}/admin`));
  assert.equal(locked.status, 401);
  assert.match(locked.headers.get('www-authenticate'), /Basic/);
  const page = await admin(new Request(`${SITE}/admin`, { headers: { authorization: basic('derrick', 'pass-one') } }));
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  const html = await page.text();
  assert.match(html, /Signed in as <strong>derrick<\/strong>/);
  assert.match(html, /id="a-form"/);
});
