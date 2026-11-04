import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accessEmail, accessOn, adminEmails } from '../lib/access.js';
import { createFormsHandler } from '../lib/forms.js';
import { createAdminHandler } from '../lib/admin.js';

const SITE = 'https://www.medengineers.org';
const TEAM = 'yme.cloudflareaccess.com';
const AUD = 'a1b2c3d4e5f6';
const env = { ACCESS_TEAM_DOMAIN: TEAM, ACCESS_AUD: AUD, ADMIN_EMAILS: 'youngmedicalengineers@gmail.com, Adam@Example.com', DATABASE_URL: 'test', DELETE_PASSWORD: 'delete-me' };
const basic = (name, password) => 'Basic ' + Buffer.from(`${name}:${password}`).toString('base64');

/* a real signing key, like the ones Access publishes at /cdn-cgi/access/certs */
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'key-1' };
let certFetches = 0;
const certs = async url => {
  certFetches++;
  assert.equal(url, `https://${TEAM}/cdn-cgi/access/certs`);
  return Response.json({ keys: [jwk] });
};
const part = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(claims = {}, { kid = 'key-1', alg = 'RS256', key = pair.privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = `${part({ alg, kid, typ: 'JWT' })}.${part({ aud: [AUD], iss: `https://${TEAM}`, email: 'YoungMedicalEngineers@gmail.com', iat: now, nbf: now, exp: now + 3600, ...claims })}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(body));
  return `${body}.${Buffer.from(sig).toString('base64url')}`;
}
const withToken = (jwt, extra = {}) => new Request(`${SITE}/admin`, { headers: { 'cf-access-jwt-assertion': jwt, ...extra } });

test('Access settings: on only with both values; admin emails are not case-sensitive', () => {
  assert.equal(accessOn({}), false);
  assert.equal(accessOn({ ACCESS_TEAM_DOMAIN: TEAM }), false);
  assert.equal(accessOn(env), true);
  assert.deepEqual([...adminEmails(env)], ['youngmedicalengineers@gmail.com', 'adam@example.com']);
});

test('a valid Access token gives the signed-in email address', async () => {
  assert.equal(await accessEmail(withToken(await token()), env, certs), 'youngmedicalengineers@gmail.com');
  assert.equal(await accessEmail(withToken(await token()), { ...env, ACCESS_TEAM_DOMAIN: `https://${TEAM}/` }, certs), 'youngmedicalengineers@gmail.com', 'a pasted address works too');
});

test('anything wrong with the token means no', async () => {
  const no = async (jwt, e = env) => assert.equal(await accessEmail(withToken(jwt), e, certs), null);
  await no('');
  await no('not.a.token');
  await no(await token({ aud: ['someone-elses-app'] }));
  await no(await token({ iss: 'https://evil.cloudflareaccess.com' }));
  await no(await token({ exp: Math.floor(Date.now() / 1000) - 3600 }));
  await no(await token({ nbf: Math.floor(Date.now() / 1000) + 3600 }));
  await no(await token({ email: undefined }));
  await no(await token({}, { key: other.privateKey }), env); /* signed by someone else */
  await no(await token({}, { alg: 'none' }));
  const good = await token();
  const [h, , s] = good.split('.');
  await no(`${h}.${part({ aud: [AUD], iss: `https://${TEAM}`, email: 'intruder@example.com', exp: 9999999999 })}.${s}`); /* changed after signing */
  const down = { ...env, ACCESS_TEAM_DOMAIN: 'down.cloudflareaccess.com' }; /* a team whose keys are not cached yet */
  assert.equal(await accessEmail(withToken(await token({ iss: 'https://down.cloudflareaccess.com' })), down, async () => new Response('down', { status: 500 })), null, 'no keys, no entry');
});

test('a new signing key is fetched when Access rotates its keys', async () => {
  const before = certFetches;
  assert.equal(await accessEmail(withToken(await token({}, { kid: 'key-2' })), env, certs), null);
  assert.ok(certFetches > before, 'an unknown key id makes it look again');
});

test('admin requests need an Access token for an admin email; with ADMIN_LOGINS, the password too', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = certs;
  try {
    const rows = [];
    const store = { async formSubmissions() { return rows; } };
    const forms = createFormsHandler({ env, storeFactory: () => store });
    const list = jwt => forms(new Request(`${SITE}/admin/api/forms`, { headers: jwt ? { 'cf-access-jwt-assertion': jwt } : {} }));
    assert.equal((await list(null)).status, 403);
    assert.equal((await list(await token({ email: 'stranger@example.com' }))).status, 403, 'signed in, but not an admin');
    assert.equal((await list(await token())).status, 200);
    assert.equal((await list(await token({ email: 'adam@example.com' }))).status, 200);

    const both = { ...env, ADMIN_LOGINS: 'adam:pass-one' };
    const page = createAdminHandler({ env: both });
    assert.equal((await page(withToken(await token()))).status, 401, 'the password is asked for as well');
    const inside = await page(withToken(await token(), { authorization: basic('adam', 'pass-one') }));
    assert.equal(inside.status, 200);
    assert.match(await inside.text(), /Signed in as <strong>adam<\/strong>/);
    assert.equal((await page(new Request(`${SITE}/admin`, { headers: { authorization: basic('adam', 'pass-one') } }))).status, 403, 'the password alone is not enough');

    const noEmails = createAdminHandler({ env: { ...env, ADMIN_EMAILS: '' } });
    assert.match((await (await noEmails(withToken(await token()))).json()).error, /ADMIN_EMAILS/);
  } finally {
    globalThis.fetch = realFetch;
  }
});
