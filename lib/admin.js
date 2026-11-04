import { signedIn } from './auth.js';
import { json } from './http.js';
import { adminPage } from './admin-page.js';

const POLICY = "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; connect-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'";

/* /admin: checks the admin sign-in (lib/auth.js), then shows the session manager. */
export function createAdminHandler({ env = process.env } = {}) {
  return async function admin(request) {
    if (!['GET', 'HEAD'].includes(request.method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
    const gate = await signedIn(request, env);
    if (gate.response) return gate.response;
    return new Response(request.method === 'HEAD' ? null : adminPage(gate.admin), {
      headers: {
        'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'same-origin', 'Content-Security-Policy': POLICY
      }
    });
  };
}
