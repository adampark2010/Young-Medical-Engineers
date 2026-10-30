/* Local version of the YME website: serves public/ and runs the same sessions API and
   admin page as Cloudflare (worker.js), with sessions saved in data/sessions.sqlite instead of Neon.
   Run: node server.mjs   then visit http://127.0.0.1:3000 (admin page: /admin). */
import { createServer } from 'node:http';
import { readFile, mkdir, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { createSqliteStore } from './lib/sqlite-store.js';
import { createSessionsHandler } from './lib/sessions.js';
import { createSignupsHandler } from './lib/signups.js';
import { createAdminHandler } from './lib/admin.js';

const root = dirname(fileURLToPath(import.meta.url));
const site = resolve(root, 'public');
const dataDir = process.env.DATA_DIR || resolve(root, 'data');
await mkdir(dataDir, { recursive: true });
const store = createSqliteStore(resolve(dataDir, 'sessions.sqlite'));
const tempLogin = `admin:${randomBytes(12).toString('base64url')}`;
const tempDelete = randomBytes(9).toString('base64url');
const env = {
  ...process.env, DATABASE_URL: 'local-sqlite',
  ADMIN_LOGINS: process.env.ADMIN_LOGINS || tempLogin, DELETE_PASSWORD: process.env.DELETE_PASSWORD || tempDelete
};
const sessions = createSessionsHandler({ env, storeFactory: () => store });
const signups = createSignupsHandler({ env, storeFactory: () => store });
const admin = createAdminHandler({ env });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8'
};

/* Node request -> standard Request, so the Cloudflare handlers run unchanged. */
function toRequest(req) {
  const headers = new Headers();
  for (let i = 0; i < req.rawHeaders.length; i += 2) headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]);
  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Readable.toWeb(req);
  return new Request(`http://${req.headers.host || 'localhost'}${req.url}`, { method: req.method, headers, body, duplex: 'half' });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined);
}

async function serveFile(req, res, pathname) {
  let file = resolve(site, '.' + decodeURIComponent(pathname));
  if (file !== site && !file.startsWith(site + sep)) { res.writeHead(404); return res.end('Page not found'); }
  try {
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Page not found');
  }
}

const server = createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const { pathname } = new URL(req.url, 'http://localhost');
    if (pathname === '/api/sessions') return await send(res, await sessions(toRequest(req)));
    if (pathname === '/api/signups') return await send(res, await signups(toRequest(req)));
    if (pathname === '/admin' || pathname === '/admin/') return await send(res, await admin(toRequest(req)));
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); return res.end('Method not allowed'); }
    return await serveFile(req, res, pathname);
  } catch (error) {
    console.error('Request failed:', error.message);
    if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Something went wrong.'); }
    else res.end();
  }
});

const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
server.listen(port, host, () => {
  console.log(`YME website is ready at http://${host}:${server.address().port}`);
  console.log('Session manager: /admin');
  if (!process.env.ADMIN_LOGINS) console.log(`Temporary admin login: ${tempLogin.replace(':', ' / ')}  (set ADMIN_LOGINS to choose your own)`);
  if (!process.env.DELETE_PASSWORD) console.log(`Temporary delete password: ${tempDelete}  (set DELETE_PASSWORD to choose your own)`);
});
process.on('SIGTERM', () => server.close(() => { store.close(); process.exit(0); }));
