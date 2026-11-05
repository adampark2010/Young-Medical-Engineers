import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPostsHandler, validPost } from '../lib/posts.js';

const SITE = 'https://www.medengineers.org';
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one', DELETE_PASSWORD: 'delete-me' };
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');
const ADMIN = basic('derrick', 'pass-one');

function memoryStore() {
  const rows = new Map();
  return {
    rows,
    async posts(kinds) { return [...rows.values()].filter(r => kinds.includes(r.kind)).map(r => ({ id: r.id, kind: r.kind, data: r.data, created_by: r.createdBy })); },
    async savePost(p) { rows.set(p.id, { ...rows.get(p.id), ...p, createdBy: rows.get(p.id)?.createdBy || p.createdBy }); },
    async removePosts(ids) { return ids.filter(id => rows.delete(id)).length; }
  };
}
function setup(overrides = {}) {
  const store = memoryStore();
  return { store, handler: createPostsHandler({ env: { ...env, ...overrides }, storeFactory: () => store }) };
}
function request(method, { body, auth = ADMIN, origin = SITE, query = '' } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (auth) headers.set('authorization', auth);
  if (origin) headers.set('origin', origin);
  return new Request(`${SITE}/admin/api/posts${query}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const article = (extra = {}) => ({ id: randomUUID(), kind: 'article', title: ' Smart  bandage ', source: 'Caltech', date: '2026-10-01', url: 'https://www.caltech.edu/news/x', note: 'Why it matters.', ...extra });
const update = (extra = {}) => ({
  id: randomUUID(), kind: 'update', title: 'We Met a Legislator', label: 'Advocacy', date: '2026-11-01',
  body: 'First paragraph.\n\nSecond   paragraph.', links: [{ text: 'Read More', href: 'https://example.org/x' }, { text: '', href: '' }], ...extra
});

test('articles and updates are checked and tidied', () => {
  const a = validPost(article());
  assert.equal(a.data.title, 'Smart bandage');
  assert.equal(a.kind, 'article');
  const u = validPost(update());
  assert.deepEqual(u.data.body, ['First paragraph.', 'Second paragraph.']);
  assert.deepEqual(u.data.links, [{ text: 'Read More', href: 'https://example.org/x' }], 'an empty button is left out');
  assert.equal(validPost(update({ image: 'assets/updates/visit.jpg' })).data.image, 'assets/updates/visit.jpg');
  for (const bad of [
    article({ url: 'http://insecure.example' }), article({ url: 'javascript:alert(1)' }), article({ title: '' }), article({ date: '2026-02-30' }),
    article({ kind: 'blog' }), update({ body: '   ' }), update({ links: [{ text: 'Go', href: '' }] }), update({ image: 'javascript:alert(1)' }),
    update({ links: [{ text: 'x', href: '//evil.example' }] })
  ]) assert.equal(validPost(bad), null, JSON.stringify(bad));
});

test('anyone reads a page\'s posts; only admins add, change and delete', async () => {
  const { store, handler } = setup();
  const a = article(), u = update();
  assert.equal((await handler(request('POST', { body: a, auth: null }))).status, 401);
  assert.equal((await handler(request('POST', { body: a, origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(request('POST', { body: a }))).status, 200);
  assert.equal((await handler(request('POST', { body: u }))).status, 200);
  const news = await (await handler(request('GET', { auth: null, origin: null, query: '?page=news' }))).json();
  assert.deepEqual(news.posts.map(p => p.id), [a.id]);
  const updates = await (await handler(request('GET', { auth: null, origin: null, query: '?page=updates' }))).json();
  assert.deepEqual(updates.posts.map(p => p.id), [u.id]);
  assert.equal((await handler(request('GET', { auth: null, origin: null, query: '?scope=admin' }))).status, 401);
  const all = await (await handler(request('GET', { query: '?scope=admin' }))).json();
  assert.equal(all.posts.length, 2);
  assert.equal(all.canDelete, true);

  /* saving with the same id changes the post rather than adding another */
  assert.equal((await handler(request('POST', { body: { ...a, title: 'Smart bandage, updated' } }))).status, 200);
  assert.equal(store.rows.size, 2);
  assert.equal(store.rows.get(a.id).data.title, 'Smart bandage, updated');

  assert.equal((await handler(request('DELETE', { body: { ids: [a.id], password: 'nope' } }))).status, 403);
  assert.deepEqual(await (await handler(request('DELETE', { body: { ids: [a.id, u.id], password: 'delete-me' } }))).json(), { removed: 2 });
  assert.equal(store.rows.size, 0);
});

test('post problems give clear messages', async () => {
  const { handler } = setup();
  assert.match((await (await handler(request('POST', { body: article({ url: 'nope' }) }))).json()).error, /https:\/\//);
  assert.match((await (await handler(request('POST', { body: update({ body: '' }) }))).json()).error, /some text/);
  assert.equal((await handler(request('GET', { auth: null, origin: null, query: '?page=other' }))).status, 400);
  assert.match((await (await setup({ DATABASE_URL: '' }).handler(request('GET', { query: '?page=news' }))).json()).error, /DATABASE_URL/);
});
