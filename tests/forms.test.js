import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createFormsHandler, validForm } from '../lib/forms.js';

const SITE = 'https://www.medengineers.org';
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one', DELETE_PASSWORD: 'delete-me' };
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');

function memoryStore() {
  const rows = new Map();
  return {
    rows,
    async addFormSubmission(f) { if (!rows.has(f.id)) rows.set(f.id, f); },
    async formSubmissions() { return [...rows.values()]; },
    async removeFormSubmissions(ids) { return ids.filter(id => rows.delete(id)).length; }
  };
}
function setup(overrides = {}) {
  const store = memoryStore();
  return { store, handler: createFormsHandler({ env: { ...env, ...overrides }, storeFactory: () => store }) };
}
function request(method, { body, auth = null, origin = SITE, type = 'application/json' } = {}) {
  const headers = new Headers();
  if (auth) headers.set('authorization', auth);
  if (origin) headers.set('origin', origin);
  if (type) headers.set('content-type', type);
  return new Request(`${SITE}/api/forms`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
}
const tutoring = (fields = {}, extra = {}) => ({
  id: randomUUID(), form: 'tutoring', ...extra,
  fields: {
    'Student name': '  Ada   Lovelace ', Email: 'ada@example.com', 'Grade level': 'High School', Subject: 'Biology',
    Goals: 'AP Bio\r\n\r\n\r\nand labs', Permission: 'Yes: 18 or older, or a parent or guardian has given permission', ...fields
  }
});

test('a tutoring request is saved in the form order, tidied, and only once', async () => {
  const { store, handler } = setup();
  const body = tutoring({ Extra: 'not asked for' });
  assert.equal((await handler(request('POST', { body }))).status, 200);
  assert.equal((await handler(request('POST', { body }))).status, 200, 'a retry is fine');
  assert.equal(store.rows.size, 1);
  const saved = store.rows.get(body.id);
  assert.equal(saved.form, 'tutoring');
  assert.deepEqual(saved.fields.map(([name]) => name), ['Student name', 'Email', 'Grade level', 'Subject', 'Goals', 'Permission']);
  assert.deepEqual(saved.fields[0], ['Student name', 'Ada Lovelace']);
  assert.deepEqual(saved.fields[4], ['Goals', 'AP Bio\n\nand labs']);
});

test('volunteer applications and messages are accepted too', () => {
  const v = validForm({ id: randomUUID(), form: 'volunteer', fields: { Name: 'Grace', Email: 'g@uni.edu', Institution: 'UIUC', Availability: 'Weekends', "How you'd like to help": 'Tutor', Subjects: 'Physics' } });
  assert.equal(v.fields.length, 6);
  const c = validForm({ id: randomUUID(), form: 'contact', fields: { Name: 'Kim', Email: 'k@example.org', Topic: 'A talk', Message: 'Hello' } });
  assert.deepEqual(c.fields.map(([name]) => name), ['Name', 'Email', 'Topic', 'Message']);
});

test('incomplete or unknown forms are refused; the hidden bot box is ignored quietly', async () => {
  const { store, handler } = setup();
  assert.equal((await handler(request('POST', { body: tutoring({ Email: 'not-an-email' }) }))).status, 400);
  assert.equal((await handler(request('POST', { body: tutoring({ Permission: '' }) }))).status, 400, 'the permission box is required');
  assert.equal((await handler(request('POST', { body: tutoring({ Goals: 'x'.repeat(2001) }) }))).status, 400);
  assert.equal((await handler(request('POST', { body: { ...tutoring(), form: 'toString' } }))).status, 400);
  assert.equal((await handler(request('POST', { body: { ...tutoring(), id: 'nope' } }))).status, 400);
  assert.equal((await handler(request('POST', { body: tutoring({}, { _honey: 'spam' }) }))).status, 200);
  assert.equal((await handler(request('POST', { body: tutoring(), origin: 'https://evil.example' }))).status, 403);
  assert.equal((await handler(request('POST', { body: tutoring(), type: 'text/plain' }))).status, 415);
  assert.equal(store.rows.size, 0);
});

test('only signed-in admins can read submissions, and deleting needs the delete password', async () => {
  const { store, handler } = setup();
  const body = tutoring();
  await handler(request('POST', { body }));
  assert.equal((await handler(request('GET'))).status, 401);
  assert.equal((await handler(request('GET', { auth: basic('derrick', 'wrong') }))).status, 401);
  const list = await handler(request('GET', { auth: basic('derrick', 'pass-one') }));
  assert.equal(list.status, 200);
  const data = await list.json();
  assert.equal(data.canDelete, true);
  assert.equal(data.submissions.length, 1);
  assert.equal((await handler(request('DELETE', { auth: basic('derrick', 'pass-one'), body: { ids: [body.id], password: 'nope' } }))).status, 403);
  assert.equal(store.rows.size, 1);
  const gone = await handler(request('DELETE', { auth: basic('derrick', 'pass-one'), body: { ids: [body.id], password: 'delete-me' } }));
  assert.deepEqual(await gone.json(), { removed: 1 });
  assert.equal(store.rows.size, 0);
});

test('form setup problems give clear messages', async () => {
  assert.match((await (await setup({ DATABASE_URL: '' }).handler(request('POST', { body: tutoring() }))).json()).error, /DATABASE_URL/);
  const broken = createFormsHandler({ env, storeFactory: () => ({ addFormSubmission() { throw Object.assign(new Error('x'), { code: '42P01' }); } }) });
  assert.match((await (await broken(request('POST', { body: tutoring() }))).json()).error, /schema\.sql/);
  const denied = createFormsHandler({ env, storeFactory: () => ({ addFormSubmission() { throw Object.assign(new Error('x'), { code: '42501' }); } }) });
  assert.match((await (await denied(request('POST', { body: tutoring() }))).json()).error, /Run db\/schema\.sql again/);
  const { createStore } = await import('../lib/database.js');
  const wrongUrl = createFormsHandler({ env: { ...env, DATABASE_URL: '9s432o44HuMsecret' }, storeFactory: createStore });
  const logged = [];
  const realError = console.error;
  console.error = (...args) => logged.push(args.join(' '));
  try {
    const answer = await wrongUrl(request('POST', { body: tutoring() }));
    assert.equal(answer.status, 503);
    assert.match((await answer.json()).error, /full connection string/);
  } finally { console.error = realError; }
  assert.ok(!logged.join(' ').includes('9s432o44HuMsecret'), 'the value is never logged');
  assert.equal((await setup().handler(new Request(`${SITE}/api/forms`, { method: 'PUT' }))).status, 405);
});
