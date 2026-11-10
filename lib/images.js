import { signedIn } from './auth.js';
import { UUID, databaseFailure, json, sameOrigin } from './http.js';

/* Pictures uploaded on /admin for the Articles pages. The admin page shrinks each one in the browser
   first, then sends the file itself (not JSON). It is kept in the database and served at
   api/images/<id>, which is what the page's Picture field then holds. Only JPEG, PNG, WebP and GIF
   are accepted, recognised by their first bytes rather than by what the browser claims, so nothing
   that could run as a page (SVG, HTML) is ever stored. */
export const MAX_IMAGE_BYTES = 1_500_000;

export function imageType(bytes) {
  const b = bytes;
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'image/png';
  if (b.length > 12 && String.fromCharCode(...b.subarray(0, 4)) === 'RIFF' && String.fromCharCode(...b.subarray(8, 12)) === 'WEBP') return 'image/webp';
  if (b.length > 6 && /^GIF8[79]a$/.test(String.fromCharCode(...b.subarray(0, 6)))) return 'image/gif';
  return null;
}

/* Reads the raw body, stopping as soon as it is larger than allowed. */
async function readBytes(request, max) {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array(0);
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.byteLength; }
  return out;
}

/* GET api/images/<id>: anyone (the pages show these). POST api/images: a signed-in admin uploads one;
   answers { url: "api/images/<id>" }. */
export function createImagesHandler({ env = process.env, storeFactory } = {}) {
  return async function images(request) {
    const method = request.method;
    const { pathname } = new URL(request.url);
    const one = /\/api\/images\/([a-f\d-]{36})$/i.exec(pathname);
    if (!env.DATABASE_URL) return json(503, { error: 'The database is not connected. Set DATABASE_URL in Cloudflare and redeploy.' });

    if (one) {
      if (method !== 'GET' && method !== 'HEAD') return json(405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      if (!UUID.test(one[1])) return json(404, { error: 'No such picture.' });
      try {
        const image = await storeFactory(env.DATABASE_URL).image(one[1].toLowerCase());
        if (!image) return json(404, { error: 'No such picture.' });
        const bytes = Buffer.from(image.data, 'base64');
        return new Response(method === 'HEAD' ? null : bytes, {
          headers: {
            'Content-Type': image.type,
            'Content-Length': String(bytes.length),
            'Cache-Control': 'public, max-age=31536000, immutable', /* a picture's address never changes what it shows */
            'X-Content-Type-Options': 'nosniff',
            'Content-Security-Policy': "default-src 'none'; sandbox",
            'Cross-Origin-Resource-Policy': 'same-origin'
          }
        });
      } catch (error) {
        return databaseFailure(error, 'Pictures are temporarily unavailable.');
      }
    }

    if (method !== 'POST') return json(405, { error: 'Method not allowed.' }, { Allow: 'POST' });
    const gate = await signedIn(request, env);
    if (gate.response) return gate.response;
    if (!sameOrigin(request)) return json(403, { error: 'Please upload pictures from the YME admin page.' });
    const bytes = await readBytes(request, MAX_IMAGE_BYTES);
    if (bytes === null) return json(413, { error: 'That picture is too large, even after shrinking. Please choose a smaller one.' });
    const type = imageType(bytes);
    if (!type) return json(415, { error: 'Please choose a JPEG, PNG, WebP or GIF picture.' });
    const id = crypto.randomUUID();
    try {
      await storeFactory(env.DATABASE_URL).saveImage({ id, type, data: Buffer.from(bytes).toString('base64'), bytes: bytes.length, createdBy: gate.admin });
      return json(200, { url: `api/images/${id}` });
    } catch (error) {
      return databaseFailure(error, 'Uploading is temporarily unavailable. Please try again.');
    }
  };
}
