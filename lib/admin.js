import { adminFrom, challenge, parseLogins } from './auth.js';
import { json } from './http.js';
import { adminPage } from './admin-page.js';

const POLICY = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";

/* /admin: asks the browser for a username and password, then shows the session manager. */
export function createAdminHandler({ env = process.env } = {}) {
  return async function admin(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
    const logins = parseLogins(env.ADMIN_LOGINS);
    if (!logins.size) return json(503, { error: 'No admin logins are set. Add ADMIN_LOGINS in Cloudflare and redeploy.' });
    const name = adminFrom(request, logins);
    if (!name) return json(401, { error: 'Sign in with your YME admin username and password.' }, challenge);
    return new Response(request.method === 'HEAD' ? null : adminPage(name), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin', 'Content-Security-Policy': POLICY
      }
    });
  };
}
