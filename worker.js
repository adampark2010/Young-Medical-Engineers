/* The YME website on Cloudflare Workers: serves public/ and runs the session manager.
   wrangler.jsonc sends /api/* and /admin here; every other request is a plain file from public/.
   Admin logins and the database connection come from the Worker's settings (env), never from files. */
import { createAdminHandler } from './lib/admin.js';
import { createSessionsHandler } from './lib/sessions.js';
import { createSignupsHandler } from './lib/signups.js';
import { createStore } from './lib/database.js';

export function createWorker({ storeFactory = createStore } = {}) {
  return {
    async fetch(request, env) {
      const { pathname } = new URL(request.url);
      if (pathname === '/api/sessions') return createSessionsHandler({ env, storeFactory })(request);
      if (pathname === '/api/signups') return createSignupsHandler({ env, storeFactory })(request);
      if (pathname === '/admin' || pathname === '/admin/') return createAdminHandler({ env })(request);
      /* html_handling is "none" so pages keep their .html addresses; the home page still answers at / */
      if (pathname === '/') return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
      return env.ASSETS.fetch(request);
    }
  };
}

export default createWorker();
