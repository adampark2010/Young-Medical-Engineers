import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createImagesHandler, imageType, MAX_IMAGE_BYTES } from '../lib/images.js';
import { createSqliteStore } from '../lib/sqlite-store.js';
import { createWorker } from '../worker.js';

const SITE = 'https://www.medengineers.org';
const env = { DATABASE_URL: 'test', ADMIN_LOGINS: 'derrick:pass-one' };
const ADMIN = 'Basic ' + Buffer.from('derrick:pass-one').toString('base64');

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6]);
const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

function memoryStore() {
  const rows = new Map();
  return { rows, async saveImage(i) { rows.set(i.id, i); }, async image(id) { return rows.get(id) || null; } };
}
function upload(body, { auth = ADMIN, origin = SITE, type = 'image/jpeg' } = {}) {
  const headers = new Headers({ 'content-type': type });
  if (auth) headers.set('authorization', auth);
  if (origin) headers.set('origin', origin);
  return new Request(`${SITE}/admin/api/images`, { method: 'POST', headers, body });
}

test('pictures are recognised by their first bytes, not by what the browser says', () => {
  assert.equal(imageType(JPEG), 'image/jpeg');
  assert.equal(imageType(PNG), 'image/png');
  assert.equal(imageType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')), 'image/webp');
  assert.equal(imageType(new TextEncoder().encode('GIF89a......')), 'image/gif');
  assert.equal(imageType(SVG), null, 'SVG could run scripts, so it is never accepted');
  assert.equal(imageType(new TextEncoder().encode('<!doctype html>')), null);
});

test('admins upload pictures; anyone can then load them', async () => {
  const store = memoryStore();
  const images = createImagesHandler({ env, storeFactory: () => store });

  assert.equal((await images(upload(JPEG, { auth: null }))).status, 401, 'signed-in admins only');
  assert.equal((await images(upload(JPEG, { origin: 'https://evil.example' }))).status, 403, 'only from the admin page');
  assert.equal((await images(upload(SVG, { type: 'image/jpeg' }))).status, 415, 'a file pretending to be a JPEG is refused');
  assert.equal((await images(upload(new Uint8Array(MAX_IMAGE_BYTES + 1)))).status, 413);
  assert.equal(store.rows.size, 0);

  const res = await images(upload(PNG, { type: 'image/jpeg' }));
  assert.equal(res.status, 200);
  const { url } = await res.json();
  assert.match(url, /^api\/images\/[a-f\d-]{36}$/);
  const saved = [...store.rows.values()][0];
  assert.equal(saved.type, 'image/png', 'stored as what the bytes really are');
  assert.equal(saved.createdBy, 'derrick');

  const got = await images(new Request(`${SITE}/${url}`));
  assert.equal(got.status, 200);
  assert.equal(got.headers.get('content-type'), 'image/png');
  assert.match(got.headers.get('cache-control'), /immutable/);
  assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(new Uint8Array(await got.arrayBuffer()), PNG);
  assert.equal((await images(new Request(`${SITE}/api/images/00000000-0000-4000-8000-000000000000`))).status, 404);
  assert.equal((await images(new Request(`${SITE}/${url}`, { method: 'DELETE' }))).status, 405);
});

test('the Cloudflare worker routes uploads and pictures', async () => {
  const store = memoryStore();
  const worker = createWorker({ storeFactory: () => store });
  const wenv = { ...env, ASSETS: { async fetch() { return new Response('file'); } } };
  const res = await worker.fetch(upload(JPEG), wenv);
  const { url } = await res.json();
  const got = await worker.fetch(new Request(`${SITE}/${url}`), wenv);
  assert.equal(got.headers.get('content-type'), 'image/jpeg');
  assert.equal(got.headers.get('strict-transport-security'), 'max-age=31536000');
});

test('local SQLite store keeps pictures', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'yme-'));
  const store = createSqliteStore(join(dir, 'site.sqlite'));
  try {
    const images = createImagesHandler({ env, storeFactory: () => store });
    const { url } = await (await images(upload(JPEG))).json();
    const got = await images(new Request(`${SITE}/${url}`));
    assert.deepEqual(new Uint8Array(await got.arrayBuffer()), JPEG);
  } finally {
    store.close?.();
    rmSync(dir, { recursive: true, force: true });
  }
});
