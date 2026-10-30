import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorker } from '../worker.js';

const SITE = 'https://www.medengineers.org';
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');

/* Stands in for Cloudflare's static files: answers with the path it was asked for. */
const assets = { async fetch(request) { return new Response(`file ${new URL(request.url).pathname}`); } };
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one', DELETE_PASSWORD: 'delete-me', ASSETS: assets };
const store = { async upcoming() { return [{ id: 'one' }]; }, async signups() { return []; } };
const worker = createWorker({ storeFactory: () => store });

test('Cloudflare worker: the API and admin page run here, with settings from env', async () => {
  const sessions = await worker.fetch(new Request(`${SITE}/api/sessions`), env);
  assert.deepEqual(await sessions.json(), { sessions: [{ id: 'one' }] });
  const signups = await worker.fetch(new Request(`${SITE}/api/signups`, { headers: { authorization: basic('derrick', 'pass-one') } }), env);
  assert.equal(signups.status, 200);
  for (const path of ['/admin', '/admin/']) {
    assert.equal((await worker.fetch(new Request(SITE + path), env)).status, 401);
    const page = await worker.fetch(new Request(SITE + path, { headers: { authorization: basic('derrick', 'pass-one') } }), env);
    assert.match(await page.text(), /Signed in as <strong>derrick<\/strong>/);
  }
  const noLogins = await worker.fetch(new Request(`${SITE}/admin`), { ...env, ADMIN_LOGINS: '' });
  assert.match((await noLogins.json()).error, /ADMIN_LOGINS in Cloudflare/);
});

test('Cloudflare worker: / is the home page; other paths are files from public/', async () => {
  assert.equal(await (await worker.fetch(new Request(`${SITE}/`), env)).text(), 'file /index.html');
  assert.equal(await (await worker.fetch(new Request(`${SITE}/about.html`), env)).text(), 'file /about.html');
  assert.equal(await (await worker.fetch(new Request(`${SITE}/sessions.json`), env)).text(), 'file /sessions.json');
});
