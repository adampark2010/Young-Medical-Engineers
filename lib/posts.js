import { deleteIds, deletePassword, signedIn } from './auth.js';
import { UUID, databaseFailure, isJson, json, readJson, sameOrigin, text } from './http.js';

/* The Articles pages, edited on /admin: "article" and "podcast" are In the News (links to other
   people's work), "update" is Our Updates (YME's own news). Each post's fields are kept as one JSON
   object, named as in news.json and updates.json, so the pages draw them the same way. */
export const KINDS = ['article', 'podcast', 'update'];
const PAGES = { news: ['article', 'podcast'], updates: ['update'] };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/* a link the page may follow: an https address, or a file on this site such as assets/updates/x.jpg */
function link(value, required = false) {
  const v = text(value, 500);
  if (v === null) return null;
  if (!v) return required ? null : '';
  return /^https:\/\/[^\s"'<>]+$/i.test(v) || /^[a-z0-9][\w\-./#?=&%]*$/i.test(v) ? v : null;
}
function realDate(v) {
  if (typeof v !== 'string' || !DATE.test(v)) return null;
  const t = Date.parse(`${v}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null;
}

/* Returns { id, kind, data } with every field checked and tidied, or null if anything is wrong. */
export function validPost(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !UUID.test(x.id) || !KINDS.includes(x.kind)) return null;
  const date = realDate(x.date);
  if (!date) return null;
  if (x.kind === 'update') {
    const title = text(x.title, 160), label = text(x.label, 40), alt = text(x.alt, 200), credit = text(x.credit, 120);
    const image = link(x.image);
    /* the text arrives as one block (paragraphs separated by a blank line) or as a list */
    const raw = Array.isArray(x.body) ? x.body : String(x.body ?? '').split(/\r?\n\s*\r?\n/);
    const body = [];
    for (const para of raw) {
      const p = text(para, 2000);
      if (p === null) return null;
      if (p) body.push(p);
    }
    if (!title || label === null || alt === null || credit === null || image === null || !body.length || body.length > 12) return null;
    const links = [];
    for (const l of Array.isArray(x.links) ? x.links : []) {
      const t = text(l?.text, 60), href = link(l?.href);
      if (t === null || href === null) return null;
      if (!t && !href) continue;
      if (!t || !href) return null; /* a button needs both its words and its address */
      links.push({ text: t, href });
    }
    if (links.length > 3) return null;
    return { id: x.id.toLowerCase(), kind: 'update', data: { title, label, date, body, image, alt, credit, links } };
  }
  const title = text(x.title, 200), source = text(x.source, 80), note = text(x.note, 300), credit = text(x.credit, 120);
  const url = link(x.url, true), image = link(x.image);
  if (!title || !source || note === null || credit === null || !url || !/^https:\/\//i.test(url) || image === null) return null;
  return { id: x.id.toLowerCase(), kind: x.kind, data: { title, source, date, url, note, image, credit } };
}

/* GET ?page=news or ?page=updates: anyone reads that page's posts. GET ?scope=admin: signed-in admins
   read them all. POST: an admin adds a post, or saves changes to one (same id). DELETE: admins remove
   some, with the DELETE_PASSWORD. */
export function createPostsHandler({ env = process.env, storeFactory } = {}) {
  return async function posts(request) {
    const method = request.method;
    if (!['GET', 'POST', 'DELETE'].includes(method)) return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, POST, DELETE' });
    if (!env.DATABASE_URL) return json(503, { error: 'The database is not connected. Set DATABASE_URL in Cloudflare and redeploy.' });
    const url = new URL(request.url);
    const adminOnly = method !== 'GET' || url.searchParams.get('scope') === 'admin';
    let admin = null;
    if (adminOnly) {
      const gate = await signedIn(request, env);
      if (gate.response) return gate.response;
      admin = gate.admin;
    }
    try {
      const store = storeFactory(env.DATABASE_URL);
      if (method === 'GET') {
        if (adminOnly) return json(200, { canDelete: Boolean(deletePassword(env)), posts: await store.posts(KINDS) });
        const kinds = PAGES[url.searchParams.get('page')];
        if (!kinds) return json(400, { error: 'Ask for page=news or page=updates.' });
        return json(200, { posts: await store.posts(kinds) });
      }
      if (!sameOrigin(request)) return json(403, { error: 'Please manage articles from the YME admin page.' });
      if (!isJson(request)) return json(415, { error: 'Please use the admin page.' });
      if (method === 'DELETE' && !deletePassword(env)) return json(503, { error: 'Deleting is switched off. Add DELETE_PASSWORD in Cloudflare and redeploy.' });
      let data;
      try { data = await readJson(request); } catch { return json(400, { error: 'We could not read that request. Please try again.' }); }
      if (method === 'DELETE') {
        const ids = deleteIds(data, env);
        return ids instanceof Response ? ids : json(200, { removed: await store.removePosts(ids) });
      }
      const post = validPost(data);
      if (!post) {
        return json(400, { error: data?.kind === 'update'
          ? 'Please check the update: a title, a date, some text, and both words and an address for any button. Links must start with https:// or be a file on this site.'
          : 'Please check the entry: a title, a source, a date, and a link that starts with https://.' });
      }
      await store.savePost({ ...post, createdBy: admin });
      return json(200, { saved: true, id: post.id });
    } catch (error) {
      return databaseFailure(error, {
        GET: 'Articles are temporarily unavailable.',
        POST: 'Saving is temporarily unavailable. Your entry is still in the form; please try again.',
        DELETE: 'Deleting is temporarily unavailable. Please try again.'
      }[method]);
    }
  };
}
