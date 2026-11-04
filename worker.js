/* The YME website on Cloudflare Workers: serves public/ and runs the session manager.
   wrangler.jsonc sends /, /api/* and /admin/* here; every other request is a plain file from public/.
   The website's forms post to /api/...; the admin page works through /admin/api/..., so Cloudflare
   Access can guard everything under /admin without getting in the way of visitors.
   Admin logins and the database connection come from the Worker's settings (env), never from files. */
import { createAdminHandler } from './lib/admin.js';
import { createSessionsHandler } from './lib/sessions.js';
import { createSignupsHandler } from './lib/signups.js';
import { createFormsHandler } from './lib/forms.js';
import { createStore } from './lib/database.js';

const HANDLERS = { sessions: createSessionsHandler, signups: createSignupsHandler, forms: createFormsHandler };

/* the Worker's own answers always ask for HTTPS (files from public/ get this from public/_headers) */
function secure(response) {
  const copy = new Response(response.body, response);
  copy.headers.set('Strict-Transport-Security', 'max-age=31536000');
  return copy;
}

export function createWorker({ storeFactory = createStore } = {}) {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      const api = /^\/(?:admin\/)?api\/(sessions|signups|forms)$/.exec(pathname);
      if (api) return secure(await HANDLERS[api[1]]({ env, storeFactory })(request));
      if (pathname === '/admin' || pathname === '/admin/') return secure(await createAdminHandler({ env })(request));
      /* html_handling is "none" so pages keep their .html addresses; the home page still answers at / */
      if (pathname === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      return env.ASSETS.fetch(request);
    }
  };
}

export default createWorker();
